import { beforeEach, describe, expect, it } from "vitest";

import {
  createDocumentToken,
  InvalidDocumentTokenError,
  readDocumentToken,
} from "@/services/document-token";

const payload = {
  storeName: "fileSearchStores/interview-demo",
  documentName:
    "fileSearchStores/interview-demo/documents/interview-document",
  fileName: "interview-guide.pdf",
  mimeType: "application/pdf",
  fileSize: 4096,
  createdAt: 1_753_272_000_000,
  summary: "A concise Gemini-generated overview.",
} as const;

describe("signed Gemini document references", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.DOCUMENT_TOKEN_SECRET;
  });

  it("round-trips an opaque signed document token", () => {
    const token = createDocumentToken(payload);

    expect(token).not.toContain(payload.storeName);
    expect(readDocumentToken(token)).toEqual({
      version: 1,
      ...payload,
    });
  });

  it("rejects a modified token", () => {
    const token = createDocumentToken(payload);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(() => readDocumentToken(tampered)).toThrow(
      InvalidDocumentTokenError,
    );
  });
});
