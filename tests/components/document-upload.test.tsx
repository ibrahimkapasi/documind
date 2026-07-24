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

import { DocumentUpload } from "@/components/document-upload";
import type { UploadedDocument } from "@/types/document-api";

const fetchMock = vi.fn();

function textFile(index: number) {
  return new File([`Document ${index} content.`], `document-${index}.txt`, {
    type: "text/plain",
  });
}

function uploadedDocument(index: number): UploadedDocument {
  return {
    id: `document-${index}`,
    fileName: `document-${index}.txt`,
    mimeType: "text/plain",
    fileSize: 20,
    status: "READY",
    createdAt: index,
  };
}

function renderUpload(
  overrides: Partial<React.ComponentProps<typeof DocumentUpload>> = {},
) {
  const props: React.ComponentProps<typeof DocumentUpload> = {
    documents: [],
    selectedDocumentId: null,
    onUploadSuccess: vi.fn(),
    onDocumentDeleted: vi.fn(),
    onDocumentSelected: vi.fn(),
    ...overrides,
  };

  render(<DocumentUpload {...props} />);
  return props;
}

describe("DocumentUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("rejects a selection larger than the five-document workspace limit", () => {
    renderUpload();

    fireEvent.change(screen.getByLabelText("Choose documents"), {
      target: { files: Array.from({ length: 6 }, (_, index) => textFile(index + 1)) },
    });

    expect(
      screen.getByText("The workspace limit is 5.", { exact: false }),
    ).toHaveAttribute("role", "alert");
    expect(screen.queryByRole("button", { name: /Upload 5 documents/i })).not.toBeInTheDocument();
  });

  it("uploads and reads five selected documents through individual requests", async () => {
    fetchMock.mockImplementation(async (_url: string, options: RequestInit) => {
      const file = (options.body as FormData).get("file") as File;
      const index = Number(file.name.match(/\d+/)?.[0] ?? "0");

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { document: uploadedDocument(index) },
        }),
      };
    });
    const onUploadSuccess = vi.fn();
    renderUpload({ onUploadSuccess });
    const user = userEvent.setup();

    fireEvent.change(screen.getByLabelText("Choose documents"), {
      target: { files: Array.from({ length: 5 }, (_, index) => textFile(index + 1)) },
    });

    await user.click(screen.getByRole("button", { name: "Upload 5 documents" }));

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(5));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(onUploadSuccess).toHaveBeenNthCalledWith(1, uploadedDocument(1));
    expect(onUploadSuccess).toHaveBeenNthCalledWith(5, uploadedDocument(5));
  });

  it("lists processed documents and lets the user choose one to preview", async () => {
    const onDocumentSelected = vi.fn();
    const documents = [uploadedDocument(1), uploadedDocument(2)];
    renderUpload({
      documents,
      selectedDocumentId: documents[0].id,
      onDocumentSelected,
    });
    const user = userEvent.setup();

    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(
      "document-1.txt",
    );

    await user.click(screen.getByRole("button", { pressed: false }));
    expect(onDocumentSelected).toHaveBeenCalledWith("document-2");
  });
});
