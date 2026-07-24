import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET } from "@/app/api/documents/[id]/route";
import { createDocumentToken } from "@/services/document-token";
import { deleteGeminiDocumentStore } from "@/services/gemini-document";

vi.mock("@/services/gemini-document", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/gemini-document")>();
  return {
    ...actual,
    deleteGeminiDocumentStore: vi.fn(),
  };
});

const deleteStoreMock = vi.mocked(deleteGeminiDocumentStore);

function documentToken() {
  return createDocumentToken({
    storeName: "fileSearchStores/guide-store",
    documentName: "fileSearchStores/guide-store/documents/guide-document",
    fileName: "guide.pdf",
    mimeType: "application/pdf",
    fileSize: 2048,
    createdAt: 1_753_272_000_000,
    summary: "Gemini identified the main points in this guide.",
  });
}

describe("/api/documents/:id", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    deleteStoreMock.mockReset();
    deleteStoreMock.mockResolvedValue();
  });

  it("reads stateless metadata and the Gemini overview from a signed token", async () => {
    const id = documentToken();
    const response = await GET(
      new Request(`http://localhost/api/documents/${encodeURIComponent(id)}`),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.document).toMatchObject({
      id,
      fileName: "guide.pdf",
      status: "READY",
      aiSummary: "Gemini identified the main points in this guide.",
    });
    expect(body.data.document).not.toHaveProperty("extractedText");
  });

  it("deletes the Gemini File Search store", async () => {
    const id = documentToken();
    const response = await DELETE(
      new Request(`http://localhost/api/documents/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(deleteStoreMock).toHaveBeenCalledWith(
      "fileSearchStores/guide-store",
    );
  });

  it("rejects an invalid or tampered document token", async () => {
    const response = await GET(
      new Request("http://localhost/api/documents/not-a-token"),
      { params: Promise.resolve({ id: "not-a-token" }) },
    );

    expect(response.status).toBe(404);
  });
});
