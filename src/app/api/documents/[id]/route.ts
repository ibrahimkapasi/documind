import { NextResponse } from "next/server";

import {
  InvalidDocumentTokenError,
  readDocumentToken,
} from "@/services/document-token";
import {
  deleteGeminiDocumentStore,
  GeminiServiceError,
} from "@/services/gemini-document";
import type {
  DocumentDeleteResponse,
  DocumentDetailsResponse,
  DocumentUploadErrorResponse,
} from "@/types/document-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json<DocumentUploadErrorResponse>(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  let document;

  try {
    document = readDocumentToken(id);
  } catch (error) {
    if (!(error instanceof InvalidDocumentTokenError)) throw error;
    return errorResponse("DOCUMENT_NOT_FOUND", "The document was not found.", 404);
  }

  return NextResponse.json<DocumentDetailsResponse>({
    success: true,
    data: {
      document: {
        id,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        status: "READY",
        errorMessage: null,
        createdAt: document.createdAt,
        aiSummary: document.summary,
      },
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  let document;

  try {
    document = readDocumentToken(id);
  } catch (error) {
    if (!(error instanceof InvalidDocumentTokenError)) throw error;
    return errorResponse("DOCUMENT_NOT_FOUND", "The document was not found.", 404);
  }

  try {
    await deleteGeminiDocumentStore(document.storeName);
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return errorResponse(error.code, error.safeMessage, error.status);
    }
    return errorResponse(
      "DOCUMENT_DELETE_FAILED",
      "The document could not be deleted from Gemini.",
      502,
    );
  }

  return NextResponse.json<DocumentDeleteResponse>({
    success: true,
    data: { id },
  });
}
