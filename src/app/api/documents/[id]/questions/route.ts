import { NextResponse } from "next/server";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json<DocumentUploadErrorResponse>(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let document;

  try {
    document = readDocumentToken(id);
  } catch (error) {
    if (!(error instanceof InvalidDocumentTokenError)) throw error;
    return errorResponse("DOCUMENT_NOT_FOUND", "The document was not found.", 404);
  }

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

  try {
    const result = await askGeminiAboutDocuments(question, [document.storeName]);

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
