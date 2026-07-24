import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as POST_ONE } from "@/app/api/documents/[id]/questions/route";
import { POST as POST_MANY } from "@/app/api/documents/questions/route";
import { createDocumentToken } from "@/services/document-token";
import { askGeminiAboutDocuments } from "@/services/gemini-document";

vi.mock("@/services/gemini-document", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/gemini-document")>();
  return {
    ...actual,
    askGeminiAboutDocuments: vi.fn(),
  };
});

const askGeminiMock = vi.mocked(askGeminiAboutDocuments);

function documentToken(storeSuffix: string, fileName: string) {
  return createDocumentToken({
    storeName: `fileSearchStores/${storeSuffix}`,
    documentName: `fileSearchStores/${storeSuffix}/documents/source-document`,
    fileName,
    mimeType: "application/pdf",
    fileSize: 100,
    createdAt: Date.now(),
    summary: "Gemini indexed this document.",
  });
}

function questionRequest(question: string, documentIds?: string[]) {
  return new Request("http://localhost/api/documents/questions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, ...(documentIds ? { documentIds } : {}) }),
  });
}

describe("Gemini document questions", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    askGeminiMock.mockReset();
    askGeminiMock.mockResolvedValue({
      answer: "Returns are accepted within thirty days.",
      citations: [
        {
          fileName: "guide.pdf",
          pageNumber: 4,
          excerpt: "Returns are accepted within thirty days.",
        },
      ],
    });
  });

  it("answers from one signed document and returns Gemini citations", async () => {
    const id = documentToken("guide-store", "guide.pdf");
    const response = await POST_ONE(questionRequest("What is the return policy?"), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      answer: "Returns are accepted within thirty days.",
      citations: [
        {
          fileName: "guide.pdf",
          pageNumber: 4,
          excerpt: "Returns are accepted within thirty days.",
        },
      ],
    });
    expect(askGeminiMock).toHaveBeenCalledWith(
      "What is the return policy?",
      ["fileSearchStores/guide-store"],
    );
  });

  it("searches all selected Gemini stores in one grounded request", async () => {
    const first = documentToken("first-store", "first.pdf");
    const second = documentToken("second-store", "second.pdf");
    const response = await POST_MANY(
      questionRequest("Compare the documents.", [first, second]),
    );

    expect(response.status).toBe(200);
    expect(askGeminiMock).toHaveBeenCalledWith("Compare the documents.", [
      "fileSearchStores/first-store",
      "fileSearchStores/second-store",
    ]);
  });

  it("rejects empty questions before calling Gemini", async () => {
    const id = documentToken("guide-store", "guide.pdf");
    const response = await POST_MANY(questionRequest("   ", [id]));

    expect(response.status).toBe(400);
    expect(askGeminiMock).not.toHaveBeenCalled();
  });

  it("rejects tampered document references", async () => {
    const response = await POST_MANY(
      questionRequest("What is this?", ["invalid-token"]),
    );

    expect(response.status).toBe(404);
    expect(askGeminiMock).not.toHaveBeenCalled();
  });
});
