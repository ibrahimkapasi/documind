import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = 1;
const MAX_TOKEN_LENGTH = 8_000;

export type GeminiDocumentTokenPayload = {
  version: typeof TOKEN_VERSION;
  storeName: string;
  documentName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
  summary: string;
};

export class InvalidDocumentTokenError extends Error {
  constructor() {
    super("The document reference is invalid or has expired.");
    this.name = "InvalidDocumentTokenError";
  }
}

function signingSecret(): string {
  const secret =
    process.env.DOCUMENT_TOKEN_SECRET?.trim() ??
    process.env.GEMINI_API_KEY?.trim();

  if (!secret) {
    throw new Error("Gemini is not configured.");
  }

  return secret;
}

function signatureFor(encodedPayload: string): Buffer {
  return createHmac("sha256", signingSecret())
    .update("documind-document-token:")
    .update(encodedPayload)
    .digest();
}

function isPayload(value: unknown): value is GeminiDocumentTokenPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;
  return (
    payload.version === TOKEN_VERSION &&
    typeof payload.storeName === "string" &&
    /^fileSearchStores\/[a-z0-9-]+$/.test(payload.storeName) &&
    typeof payload.documentName === "string" &&
    /^fileSearchStores\/[a-z0-9-]+\/documents\/[a-z0-9-]+$/.test(
      payload.documentName,
    ) &&
    typeof payload.fileName === "string" &&
    payload.fileName.length > 0 &&
    payload.fileName.length <= 255 &&
    typeof payload.mimeType === "string" &&
    payload.mimeType.length > 0 &&
    payload.mimeType.length <= 150 &&
    typeof payload.fileSize === "number" &&
    Number.isSafeInteger(payload.fileSize) &&
    payload.fileSize > 0 &&
    typeof payload.createdAt === "number" &&
    Number.isSafeInteger(payload.createdAt) &&
    typeof payload.summary === "string" &&
    payload.summary.length <= 1_200
  );
}

export function createDocumentToken(
  payload: Omit<GeminiDocumentTokenPayload, "version">,
): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({ version: TOKEN_VERSION, ...payload }),
  ).toString("base64url");
  const signature = signatureFor(encodedPayload).toString("base64url");
  return `${encodedPayload}.${signature}`;
}

export function readDocumentToken(token: string): GeminiDocumentTokenPayload {
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new InvalidDocumentTokenError();
  }

  const [encodedPayload, encodedSignature, extraPart] = token.split(".");

  if (!encodedPayload || !encodedSignature || extraPart) {
    throw new InvalidDocumentTokenError();
  }

  try {
    const suppliedSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = signatureFor(encodedPayload);

    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      throw new InvalidDocumentTokenError();
    }

    const payload: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );

    if (!isPayload(payload)) throw new InvalidDocumentTokenError();
    return payload;
  } catch (error) {
    if (error instanceof InvalidDocumentTokenError) throw error;
    throw new InvalidDocumentTokenError();
  }
}
