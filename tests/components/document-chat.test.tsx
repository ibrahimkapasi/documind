// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentChat } from "@/components/document-chat";
import type { UploadedDocument } from "@/types/document-api";

const fetchMock = vi.fn();

const document: UploadedDocument = {
  id: "signed-document-token",
  fileName: "offer.pdf",
  mimeType: "application/pdf",
  fileSize: 2048,
  status: "READY",
  createdAt: 1,
};

describe("DocumentChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => "chat-entry-1" });
    fetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a Gemini answer with filename and page citation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          answer: "The offer remains valid for thirty days.",
          citations: [
            {
              fileName: "offer.pdf",
              pageNumber: 2,
              excerpt: "This offer is valid for thirty days.",
            },
          ],
        },
      }),
    });
    const user = userEvent.setup();

    render(
      <DocumentChat
        documents={[document]}
        selectedDocumentId={document.id}
      />,
    );

    await user.type(
      screen.getByLabelText("Question about the documents"),
      "How long is the offer valid?",
    );
    await user.click(screen.getByRole("button", { name: "Ask Gemini" }));

    expect(
      await screen.findByText("The offer remains valid for thirty days."),
    ).toBeInTheDocument();
    expect(screen.getByText("offer.pdf")).toBeInTheDocument();
    expect(screen.getByText("· page 2")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/documents/questions",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
