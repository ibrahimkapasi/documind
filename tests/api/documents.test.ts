import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/documents/route";
import { readDocumentToken } from "@/services/document-token";
import {
  GeminiServiceError,
  indexDocumentWithGemini,
} from "@/services/gemini-document";

vi.mock("@/services/gemini-document", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/gemini-document")>();
  return {
    ...actual,
    indexDocumentWithGemini: vi.fn(),
  };
});

const indexDocumentMock = vi.mocked(indexDocumentWithGemini);

function uploadRequest(entries: Array<[string, File]>): Request {
  const formData = new FormData();
  for (const [field, file] of entries) formData.append(field, file);
  return new Request("http://localhost/api/documents", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/documents", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    indexDocumentMock.mockReset();
    indexDocumentMock.mockResolvedValue({
      storeName: "fileSearchStores/guide-store",
      documentName: "fileSearchStores/guide-store/documents/notes-document",
      summary: "Gemini found a useful set of notes.",
    });
  });

  it("indexes a valid document with Gemini and returns a signed reference", async () => {
    const response = await POST(
      uploadRequest([
        ["file", new File(["Useful document text."], "notes.txt", { type: "text/plain" })],
      ]),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.document).toMatchObject({
      fileName: "notes.txt",
      mimeType: "text/plain",
      status: "READY",
    });
    expect(indexDocumentMock).toHaveBeenCalledOnce();

    expect(readDocumentToken(body.data.document.id)).toMatchObject({
      storeName: "fileSearchStores/guide-store",
      documentName: "fileSearchStores/guide-store/documents/notes-document",
      fileName: "notes.txt",
      summary: "Gemini found a useful set of notes.",
    });
  });

  it.each([
    [[], 400, "MISSING_FILE"],
    [
      [
        ["file", new File(["one"], "one.txt", { type: "text/plain" })],
        ["file", new File(["two"], "two.txt", { type: "text/plain" })],
      ],
      400,
      "MULTIPLE_FILES",
    ],
    [
      [["file", new File(["data"], "notes.csv", { type: "text/plain" })]],
      415,
      "UNSUPPORTED_EXTENSION",
    ],
    [
      [["file", new File(["data"], "notes.txt", { type: "image/png" })]],
      415,
      "UNSUPPORTED_MIME_TYPE",
    ],
    [
      [["file", new File([], "empty.txt", { type: "text/plain" })]],
      400,
      "EMPTY_FILE",
    ],
  ] as Array<[Array<[string, File]>, number, string]>)(
    "rejects invalid file input %#",
    async (entries, status, code) => {
      const response = await POST(uploadRequest(entries));
      const body = await response.json();
      expect(response.status).toBe(status);
      expect(body.error.code).toBe(code);
    },
  );

  it("returns a safe Gemini quota error", async () => {
    indexDocumentMock.mockRejectedValueOnce(
      new GeminiServiceError(
        "GEMINI_QUOTA_EXCEEDED",
        "The Gemini processing limit has been reached. Try again after your Gemini quota resets or use an API key with available quota.",
        429,
      ),
    );

    const response = await POST(
      uploadRequest([
        ["file", new File(["Document"], "notes.txt", { type: "text/plain" })],
      ]),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toEqual({
      code: "GEMINI_QUOTA_EXCEEDED",
      message:
        "The Gemini processing limit has been reached. Try again after your Gemini quota resets or use an API key with available quota.",
    });
  });
});
