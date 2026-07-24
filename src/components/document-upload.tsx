"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  LoaderCircle,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useId,
  useRef,
  useState,
} from "react";

import {
  DOCX_MIME_TYPE,
  DOCUMENT_FILE_ACCEPT,
  MAX_DOCUMENT_FILE_SIZE_LABEL,
  MAX_DOCUMENTS_PER_WORKSPACE,
} from "@/config/document-upload";
import type {
  DocumentDeleteResponse,
  DocumentUploadResponse,
  UploadedDocument,
} from "@/types/document-api";
import { validateDocumentFiles } from "@/validation/document-file";

type PendingDocument = {
  key: string;
  file: File;
  status: "ready" | "invalid" | "uploading" | "failure";
  error?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(file: File): string {
  return file.name.split(".").pop()?.toUpperCase() || "FILE";
}

function uploadedFileTypeLabel(document: UploadedDocument): string {
  if (document.mimeType === "application/pdf") return "PDF";
  if (document.mimeType === DOCX_MIME_TYPE) return "WORD";
  if (document.mimeType === "text/plain") return "TXT";
  if (document.mimeType === "image/png") return "PNG";
  if (document.mimeType === "image/jpeg") return "JPG";
  if (document.mimeType === "image/webp") return "WEBP";
  return "FILE";
}

export function DocumentUpload({
  documents,
  selectedDocumentId,
  onUploadSuccess,
  onDocumentDeleted,
  onDocumentSelected,
}: {
  documents: UploadedDocument[];
  selectedDocumentId: string | null;
  onUploadSuccess: (document: UploadedDocument) => void;
  onDocumentDeleted: (documentId: string) => void;
  onDocumentSelected: (documentId: string) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextPendingId = useRef(0);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const workspaceCount = documents.length + pendingDocuments.length;
  const remainingSlots = MAX_DOCUMENTS_PER_WORKSPACE - workspaceCount;
  const uploadableDocuments = pendingDocuments.filter(
    ({ status }) => status === "ready" || status === "failure",
  );
  const isUploading = pendingDocuments.some(({ status }) => status === "uploading");

  function updatePendingDocument(
    key: string,
    update: Partial<Omit<PendingDocument, "key" | "file">>,
  ) {
    setPendingDocuments((current) =>
      current.map((document) =>
        document.key === key ? { ...document, ...update } : document,
      ),
    );
  }

  function validateSelection(files: FileList | readonly File[]) {
    const selectedFiles = Array.from(files);

    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > remainingSlots) {
      setSelectionError(
        remainingSlots === 0
          ? `This workspace already contains ${MAX_DOCUMENTS_PER_WORKSPACE} documents. Remove one before adding another.`
          : `You can add ${remainingSlots} more ${
              remainingSlots === 1 ? "document" : "documents"
            }. The workspace limit is ${MAX_DOCUMENTS_PER_WORKSPACE}.`,
      );
      return;
    }

    const entries = selectedFiles.map((file): PendingDocument => {
      const validation = validateDocumentFiles([file]);
      const key = `${Date.now()}-${nextPendingId.current++}`;

      return validation.success
        ? { key, file, status: "ready" }
        : {
            key,
            file,
            status: "invalid",
            error: validation.message,
          };
    });

    setPendingDocuments((current) => [...current, ...entries]);
    setSelectionError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    validateSelection(event.target.files ?? []);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) validateSelection(event.dataTransfer.files);
  }

  function removePendingDocument(key: string) {
    setPendingDocuments((current) =>
      current.filter((document) => document.key !== key),
    );
    setSelectionError(null);
  }

  async function uploadDocuments() {
    if (uploadableDocuments.length === 0 || isUploading) return;

    setSelectionError(null);
    setPendingDocuments((current) =>
      current.map((document) =>
        uploadableDocuments.some(({ key }) => key === document.key)
          ? { ...document, status: "uploading", error: undefined }
          : document,
      ),
    );

    for (const pendingDocument of uploadableDocuments) {
      const formData = new FormData();
      formData.set("file", pendingDocument.file);

      try {
        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as DocumentUploadResponse;

        if (!response.ok || !payload.success) {
          if (!payload.success && payload.error.documentId) {
            onUploadSuccess({
              id: payload.error.documentId,
              fileName: pendingDocument.file.name,
              mimeType: pendingDocument.file.type,
              fileSize: pendingDocument.file.size,
              status: "FAILED",
              createdAt: Date.now(),
            });
            setPendingDocuments((current) =>
              current.filter(({ key }) => key !== pendingDocument.key),
            );
            continue;
          }

          updatePendingDocument(pendingDocument.key, {
            status: "failure",
            error: payload.success
              ? "The document could not be uploaded. Please try again."
              : payload.error.message,
          });
          continue;
        }

        onUploadSuccess(payload.data.document);
        setPendingDocuments((current) =>
          current.filter(({ key }) => key !== pendingDocument.key),
        );
      } catch {
        updatePendingDocument(pendingDocument.key, {
          status: "failure",
          error: "The upload could not be completed. Check your connection and try again.",
        });
      }
    }
  }

  async function deleteUploadedDocument(document: UploadedDocument) {
    const confirmed = window.confirm(
      `Delete "${document.fileName}"? The document and its chat history will be permanently deleted.`,
    );
    if (!confirmed) return;

    setDeletingDocumentId(document.id);
    setSelectionError(null);

    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(document.id)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as DocumentDeleteResponse;

      if (!response.ok || !payload.success) {
        setSelectionError(
          payload.success
            ? "The document could not be deleted."
            : payload.error.message,
        );
        return;
      }

      onDocumentDeleted(document.id);
    } catch {
      setSelectionError("The document could not be deleted. Please try again.");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  return (
    <article className="workspace-card flex flex-col">
      <header className="card-heading">
        <span className="icon-tile">
          <UploadCloud aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Add documents</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Word, text, PDFs, and images with OCR
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {workspaceCount}/{MAX_DOCUMENTS_PER_WORKSPACE}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <input
          ref={inputRef}
          id={inputId}
          className="sr-only"
          type="file"
          accept={DOCUMENT_FILE_ACCEPT}
          multiple
          disabled={remainingSlots === 0 || isUploading}
          aria-describedby={`${inputId}-help ${inputId}-error`}
          onChange={handleInputChange}
        />

        <div
          className={`rounded-xl border border-dashed px-4 py-5 text-center transition ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100"
              : selectionError
                ? "border-red-300 bg-red-50/50"
                : "border-slate-300 bg-slate-50/70"
          } ${remainingSlots === 0 || isUploading ? "opacity-60" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isUploading && remainingSlots > 0) setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          <FileUp aria-hidden="true" className="mx-auto text-indigo-600" size={24} />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {isDragging ? "Drop your documents here" : "Choose or drop documents"}
          </p>
          <p
            id={`${inputId}-help`}
            className="mx-auto mt-1 max-w-64 text-xs leading-5 text-slate-500"
          >
            PDF, DOCX, TXT, PNG, JPG, or WebP · {MAX_DOCUMENT_FILE_SIZE_LABEL} each.{" "}
            {remainingSlots > 0
              ? `${remainingSlots} ${remainingSlots === 1 ? "slot" : "slots"} remaining.`
              : "Workspace full."}
          </p>
          <label
            className={`mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition ${
              remainingSlots === 0 || isUploading
                ? "cursor-not-allowed bg-slate-300"
                : "cursor-pointer hover:bg-indigo-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
            }`}
            htmlFor={inputId}
          >
            Choose documents
          </label>
        </div>

        <p
          id={`${inputId}-error`}
          className={`mt-3 flex items-start gap-2 text-xs leading-5 text-red-700 ${
            selectionError ? "" : "sr-only"
          }`}
          role="alert"
          aria-live="polite"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
          {selectionError ?? "No selection error"}
        </p>

        {workspaceCount > 0 ? (
          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {documents.map((document) => {
              const isSelected = document.id === selectedDocumentId;
              const isDeleting = document.id === deletingDocumentId;

              return (
                <div
                  key={document.id}
                  className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onDocumentSelected(document.id)}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                        document.status === "READY"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {document.status === "READY" ? (
                        <CheckCircle2 aria-hidden="true" size={18} />
                      ) : (
                        <AlertCircle aria-hidden="true" size={18} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-xs font-semibold text-slate-900"
                        title={document.fileName}
                      >
                        {document.fileName}
                      </span>
                      <span className="mt-0.5 block text-[0.68rem] text-slate-500">
                        {uploadedFileTypeLabel(document)} ·{" "}
                        {formatFileSize(document.fileSize)} ·{" "}
                        {document.status === "READY" ? "Ready" : "Failed"}
                      </span>
                    </span>
                    {isSelected ? (
                      <Search
                        aria-label="Currently previewing"
                        className="shrink-0 text-indigo-600"
                        size={15}
                      />
                    ) : null}
                  </button>
                  <button
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    aria-label={`Delete ${document.fileName}`}
                    disabled={isDeleting}
                    onClick={() => void deleteUploadedDocument(document)}
                  >
                    {isDeleting ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="animate-spin"
                        size={15}
                      />
                    ) : (
                      <Trash2 aria-hidden="true" size={15} />
                    )}
                  </button>
                </div>
              );
            })}

            {pendingDocuments.map((document) => {
              const isInvalid =
                document.status === "invalid" || document.status === "failure";

              return (
                <div
                  key={document.key}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    isInvalid
                      ? "border-red-200 bg-red-50/60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      isInvalid
                        ? "bg-red-100 text-red-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {document.status === "uploading" ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="animate-spin"
                        size={18}
                      />
                    ) : isInvalid ? (
                      <AlertCircle aria-hidden="true" size={18} />
                    ) : (
                      <FileText aria-hidden="true" size={18} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-xs font-semibold text-slate-900"
                      title={document.file.name}
                    >
                      {document.file.name}
                    </span>
                    <span
                      className={`mt-0.5 block text-[0.68rem] ${
                        isInvalid ? "text-red-700" : "text-slate-500"
                      }`}
                    >
                      {document.error ??
                        `${fileTypeLabel(document.file)} · ${formatFileSize(
                          document.file.size,
                        )} · ${
                          document.status === "uploading"
                            ? "Gemini is indexing…"
                            : "Ready to upload"
                        }`}
                    </span>
                  </span>
                  <button
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    aria-label={`Remove ${document.file.name}`}
                    disabled={document.status === "uploading"}
                    onClick={() => removePendingDocument(document.key)}
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-28 flex-1 items-center justify-center text-center">
            <p className="max-w-56 text-xs leading-5 text-slate-500">
              Selected documents will appear here with their individual Gemini
              indexing status.
            </p>
          </div>
        )}

        {uploadableDocuments.length > 0 ? (
          <button
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            type="button"
            disabled={isUploading}
            onClick={() => void uploadDocuments()}
          >
            {isUploading ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <UploadCloud aria-hidden="true" size={16} />
            )}
            {isUploading
              ? "Gemini is indexing…"
              : `Upload ${uploadableDocuments.length} ${
                  uploadableDocuments.length === 1 ? "document" : "documents"
                }`}
          </button>
        ) : null}
      </div>
    </article>
  );
}
