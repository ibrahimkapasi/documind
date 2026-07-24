"use client";

import {
  AlertCircle,
  AlignLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { DOCX_MIME_TYPE } from "@/config/document-upload";
import type {
  DocumentDeleteResponse,
  DocumentDetails,
  DocumentDetailsResponse,
} from "@/types/document-api";

type PreviewState =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "ready"; document: DocumentDetails }
  | { status: "error"; message: string }
  | { status: "deleted" };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === DOCX_MIME_TYPE) return "Word document";
  if (mimeType === "text/plain") return "TXT";
  if (mimeType === "image/png") return "PNG image";
  if (mimeType === "image/jpeg") return "JPG image";
  if (mimeType === "image/webp") return "WebP image";
  return "Document";
}

function statusStyle(status: DocumentDetails["status"]) {
  switch (status) {
    case "READY":
      return {
        label: "Ready",
        classes: "bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };
    case "FAILED":
      return {
        label: "Failed",
        classes: "bg-red-50 text-red-700",
        icon: AlertCircle,
      };
  }
}

export function DocumentPreview({
  documentId,
  wasDeleted,
  onDocumentDeleted,
}: {
  documentId: string | null;
  wasDeleted: boolean;
  onDocumentDeleted: (documentId: string) => void;
}) {
  const [previewState, setPreviewState] = useState<PreviewState>(
    wasDeleted ? { status: "deleted" } : { status: "empty" },
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setPreviewState(wasDeleted ? { status: "deleted" } : { status: "empty" });
      return;
    }

    const controller = new AbortController();
    setPreviewState({ status: "loading" });
    setIsExpanded(false);
    setActionError(null);

    async function loadDocument() {
      try {
        const response = await fetch(
          `/api/documents/${encodeURIComponent(documentId!)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as DocumentDetailsResponse;

        if (!response.ok || !payload.success) {
          setPreviewState({
            status: "error",
            message: payload.success
              ? "The document could not be loaded."
              : payload.error.message,
          });
          return;
        }

        setPreviewState({ status: "ready", document: payload.data.document });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPreviewState({
          status: "error",
          message: "The document preview could not be loaded. Please try again.",
        });
      }
    }

    void loadDocument();
    return () => controller.abort();
  }, [documentId, wasDeleted]);

  async function deleteDocument(mode: "delete" | "replace") {
    if (!documentId || previewState.status !== "ready") return;

    const confirmed = window.confirm(
      mode === "replace"
        ? "Replace this document? The current document and its chat history will be permanently deleted."
        : "Delete this document? The document and its chat history will be permanently deleted.",
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(documentId)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as DocumentDeleteResponse;

      if (!response.ok || !payload.success) {
        setActionError(
          payload.success
            ? "The document could not be deleted."
            : payload.error.message,
        );
        return;
      }

      setPreviewState({ status: "deleted" });
      onDocumentDeleted(documentId);
    } catch {
      setActionError("The document could not be deleted. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  let content: React.ReactNode;

  if (previewState.status === "loading") {
    content = (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center" role="status">
        <div>
          <LoaderCircle
            aria-hidden="true"
            className="mx-auto animate-spin text-indigo-500"
            size={28}
          />
          <p className="mt-4 text-sm font-medium text-slate-700">Loading document…</p>
        </div>
      </div>
    );
  } else if (previewState.status === "deleted") {
    content = (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center" role="status">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <Trash2 aria-hidden="true" size={23} />
          </span>
          <h3 className="mt-5 text-sm font-semibold text-slate-800">Document deleted</h3>
          <p className="mx-auto mt-2 max-w-64 text-xs leading-5 text-slate-500">
            Add another document or image to start a new workspace.
          </p>
        </div>
      </div>
    );
  } else if (previewState.status === "error") {
    content = (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center" role="alert">
        <div>
          <AlertCircle aria-hidden="true" className="mx-auto text-red-500" size={28} />
          <h3 className="mt-4 text-sm font-semibold text-slate-800">Preview unavailable</h3>
          <p className="mx-auto mt-2 max-w-64 text-xs leading-5 text-red-700">
            {previewState.message}
          </p>
        </div>
      </div>
    );
  } else if (previewState.status === "ready") {
    const document = previewState.document;
    const status = statusStyle(document.status);
    const StatusIcon = status.icon;
    const text = document.aiSummary ?? "";

    content = (
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <FileText aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900" title={document.fileName}>
                {document.fileName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {fileTypeLabel(document.mimeType)} · {formatFileSize(document.fileSize)}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${status.classes}`}>
              <StatusIcon
                aria-hidden="true"
                size={13}
              />
              {status.label}
            </span>
          </div>
        </div>

        {document.status === "FAILED" ? (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-3 text-xs leading-5 text-red-700" role="alert">
            {document.errorMessage ?? "The document could not be processed."}
          </div>
        ) : document.status === "READY" && text ? (
          <>
            <button
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((current) => !current)}
            >
              <span>Gemini document overview</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600">
                {isExpanded ? "Collapse" : "Expand"}
                {isExpanded ? (
                  <ChevronUp aria-hidden="true" size={15} />
                ) : (
                  <ChevronDown aria-hidden="true" size={15} />
                )}
              </span>
            </button>
            {isExpanded ? (
              <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4">
                <pre
                  className="whitespace-pre-wrap break-words text-start font-sans text-xs leading-6 text-slate-700"
                  dir="auto"
                >
                  {text}
                </pre>
              </div>
            ) : null}
          </>
        ) : null}

        {actionError ? (
          <p className="mt-3 text-xs leading-5 text-red-700" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isDeleting}
            onClick={() => void deleteDocument("replace")}
          >
            <RefreshCw aria-hidden="true" size={15} />
            Replace
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isDeleting}
            onClick={() => void deleteDocument("delete")}
          >
            {isDeleting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Trash2 aria-hidden="true" size={15} />
            )}
            Delete
          </button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <FileText aria-hidden="true" size={24} />
          </span>
          <h3 className="mt-5 text-sm font-semibold text-slate-800">Nothing to preview yet</h3>
          <p className="mx-auto mt-2 max-w-64 text-xs leading-5 text-slate-500">
            Upload a document to see Gemini&apos;s document overview here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <article className="workspace-card flex flex-col">
      <header className="card-heading">
        <span className="icon-tile">
          <AlignLeft aria-hidden="true" size={18} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI document preview</h2>
          <p className="mt-0.5 text-xs text-slate-500">Generated after Gemini indexing</p>
        </div>
        {previewState.status === "error" && documentId ? (
          <button
            className="ml-auto grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            type="button"
            aria-label="Retry loading document"
            onClick={() => {
              setPreviewState({ status: "loading" });
              window.location.reload();
            }}
          >
            <RotateCcw aria-hidden="true" size={16} />
          </button>
        ) : null}
      </header>
      {content}
    </article>
  );
}
