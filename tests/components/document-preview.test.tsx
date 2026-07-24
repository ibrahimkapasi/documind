// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentPreview } from "@/components/document-preview";

const fetchMock = vi.fn();

function successfulResponse(document: Record<string, unknown>) {
  return Promise.resolve({
    ok: true,
    json: async () => ({
      success: true,
      data: { document },
    }),
  });
}

function readyDocument(aiSummary = "Gemini found the main points in this document.") {
  return {
    id: "cm-document-1",
    fileName: "guide.pdf",
    mimeType: "application/pdf",
    fileSize: 2048,
    status: "READY",
    errorMessage: null,
    aiSummary,
    createdAt: 1_753_272_000_000,
  };
}

describe("DocumentPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the empty and deleted states", () => {
    const { rerender } = render(
      <DocumentPreview
        documentId={null}
        wasDeleted={false}
        onDocumentDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText("Nothing to preview yet")).toBeInTheDocument();

    rerender(
      <DocumentPreview
        documentId={null}
        wasDeleted
        onDocumentDeleted={vi.fn()}
      />,
    );
    expect(screen.getByText("Document deleted")).toBeInTheDocument();
  });

  it("loads metadata and expands the Gemini document overview", async () => {
    const text = "Gemini found the return policy, delivery terms, and contact details.";
    fetchMock.mockReturnValue(successfulResponse(readyDocument(text)));
    const user = userEvent.setup();

    render(
      <DocumentPreview
        documentId="cm-document-1"
        wasDeleted={false}
        onDocumentDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText("Loading document…")).toBeInTheDocument();
    expect(await screen.findByText("guide.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF · 2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText(text)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: true })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("shows persisted processing failures", async () => {
    fetchMock.mockReturnValue(
      successfulResponse({
        ...readyDocument(""),
        status: "FAILED",
        errorMessage: "No selectable text was found.",
      }),
    );

    render(
      <DocumentPreview
        documentId="cm-document-1"
        wasDeleted={false}
        onDocumentDeleted={vi.fn()}
      />,
    );

    expect(await screen.findByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("No selectable text was found.")).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("requires confirmation before deleting and reports the deleted state", async () => {
    fetchMock
      .mockReturnValueOnce(successfulResponse(readyDocument()))
      .mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: "cm-document-1" },
          }),
        }),
      );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDocumentDeleted = vi.fn();

    render(
      <DocumentPreview
        documentId="cm-document-1"
        wasDeleted={false}
        onDocumentDeleted={onDocumentDeleted}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(onDocumentDeleted).toHaveBeenCalledWith("cm-document-1"),
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("permanently deleted"),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/documents/cm-document-1",
      { method: "DELETE" },
    );
    expect(screen.getByText("Document deleted")).toBeInTheDocument();
  });
});
