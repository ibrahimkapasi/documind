import { NextResponse } from "next/server";

import { createDocumentToken } from "@/services/document-token";
import {
  GeminiServiceError,
  indexDocumentWithGemini,
} from "@/services/gemini-document";
import type {
  DocumentUploadErrorResponse,
  DocumentUploadSuccessResponse,
} from "@/types/document-api";
import {
  type DocumentFileValidationErrorCode,
  validateDocumentFiles,
} from "@/validation/document-file";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALIDATION_STATUS: Record<DocumentFileValidationErrorCode, number> = {
  MISSING_FILE: 400,
  MULTIPLE_FILES: 400,
  UNSUPPORTED_EXTENSION: 415,
  UNSUPPORTED_MIME_TYPE: 415,
  EMPTY_FILE: 400,
  FILE_TOO_LARGE: 413,
};

function errorResponse(
  code: string,
  message: string,
  status: number,
  documentId?: string,
) {
  return NextResponse.json<DocumentUploadErrorResponse>(
    {
      success: false,
      error: { code, message, ...(documentId ? { documentId } : {}) },
    },
    { status },
  );
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return errorResponse(
      "INVALID_CONTENT_TYPE",
      "The request must use multipart form data.",
      415,
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("INVALID_FORM_DATA", "The uploaded form data is invalid.", 400);
  }

  const allFiles = Array.from(formData.values()).filter(
    (value): value is File => typeof value !== "string",
  );
  const namedFiles = formData
    .getAll("file")
    .filter((value): value is File => typeof value !== "string");

  if (allFiles.length > 1) {
    const result = validateDocumentFiles(allFiles);
    return errorResponse(
      result.success ? "MULTIPLE_FILES" : result.code,
      result.success
        ? "Only one document can be selected at a time."
        : result.message,
      400,
    );
  }

  const validation = validateDocumentFiles(namedFiles);

  if (!validation.success) {
    return errorResponse(
      validation.code,
      validation.message,
      VALIDATION_STATUS[validation.code],
    );
  }

  try {
    const createdAt = Date.now();
    const indexedDocument = await indexDocumentWithGemini(validation.file);
    const documentId = createDocumentToken({
      storeName: indexedDocument.storeName,
      documentName: indexedDocument.documentName,
      fileName: validation.file.name,
      mimeType: validation.file.type,
      fileSize: validation.file.size,
      createdAt,
      summary: indexedDocument.summary,
    });

    return NextResponse.json<DocumentUploadSuccessResponse>(
      {
        success: true,
        data: {
          document: {
            id: documentId,
            fileName: validation.file.name,
            mimeType: validation.file.type,
            fileSize: validation.file.size,
            status: "READY",
            createdAt,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return errorResponse(error.code, error.safeMessage, error.status);
    }

    console.error("Gemini document indexing failed.");
    return errorResponse(
      "GEMINI_DOCUMENT_CREATE_FAILED",
      "Gemini could not process the document. Please try again.",
      500,
    );
  }
}
