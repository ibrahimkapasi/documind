import { NextResponse } from "next/server";

import { MAX_DOCUMENTS_PER_WORKSPACE } from "@/config/document-upload";
import {
  InvalidDocumentTokenError,
  readDocumentToken,
} from "@/services/document-token";
import {
  askGeminiAboutDocuments,
  GeminiServiceError,
} from "@/services/gemini-document";
import type {
  DocumentUploadErrorResponse,
  QuestionResponse,
} from "@/types/document-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json<DocumentUploadErrorResponse>(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "The request body must be valid JSON.", 400);
  }

  const question =
    typeof body === "object" &&
    body !== null &&
    "question" in body &&
    typeof body.question === "string"
      ? body.question.trim()
      : "";
  const rawDocumentIds =
    typeof body === "object" &&
    body !== null &&
    "documentIds" in body &&
    Array.isArray(body.documentIds)
      ? body.documentIds
      : [];

  if (!question) {
    return errorResponse("INVALID_QUESTION", "Enter a question to continue.", 400);
  }

  if (question.length > 500) {
    return errorResponse(
      "QUESTION_TOO_LONG",
      "The question must be 500 characters or fewer.",
      400,
    );
  }

  if (!rawDocumentIds.every((id): id is string => typeof id === "string")) {
    return errorResponse(
      "INVALID_DOCUMENT_IDS",
      "The document list is invalid.",
      400,
    );
  }

  const documentIds = [...new Set(rawDocumentIds.map((id) => id.trim()))].filter(
    Boolean,
  );

  if (documentIds.length === 0) {
    return errorResponse(
      "MISSING_DOCUMENTS",
      "Upload a ready document before asking Gemini.",
      400,
    );
  }

  if (documentIds.length > MAX_DOCUMENTS_PER_WORKSPACE) {
    return errorResponse(
      "TOO_MANY_DOCUMENTS",
      `You can ask about up to ${MAX_DOCUMENTS_PER_WORKSPACE} documents at once.`,
      400,
    );
  }

  let documents;
  try {
    documents = documentIds.map(readDocumentToken);
  } catch (error) {
    if (!(error instanceof InvalidDocumentTokenError)) throw error;
    return errorResponse(
      "NO_SEARCHABLE_DOCUMENTS",
      "One or more document references are invalid. Upload them again.",
      404,
    );
  }

  try {
    const result = await askGeminiAboutDocuments(
      question,
      documents.map(({ storeName }) => storeName),
    );

    return NextResponse.json<QuestionResponse>({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return errorResponse(error.code, error.safeMessage, error.status);
    }
    return errorResponse(
      "GEMINI_QUESTION_FAILED",
      "Gemini could not answer the question. Please try again.",
      502,
    );
  }
}
