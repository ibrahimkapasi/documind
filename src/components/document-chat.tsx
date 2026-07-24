"use client";

import {
  AlertCircle,
  ArrowUp,
  BookOpenCheck,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import type {
  QuestionResponse,
  UploadedDocument,
} from "@/types/document-api";

type ChatEntry = {
  id: string;
  question: string;
  answer: string;
  citations: Array<{
    fileName?: string;
    pageNumber?: number;
    excerpt?: string;
  }>;
};

type SearchScope = "all" | "selected";

export function DocumentChat({
  documents,
  selectedDocumentId,
}: {
  documents: UploadedDocument[];
  selectedDocumentId: string | null;
}) {
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<SearchScope>("all");

  const searchableDocuments = documents.filter(
    (document) => document.status === "READY",
  );
  const selectedDocument = searchableDocuments.find(
    (document) => document.id === selectedDocumentId,
  );
  const activeDocumentIds =
    searchScope === "all"
      ? searchableDocuments.map((document) => document.id)
      : selectedDocument
        ? [selectedDocument.id]
        : [];
  const canSearch = activeDocumentIds.length > 0;

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!canSearch || !trimmedQuestion || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: trimmedQuestion,
          documentIds: activeDocumentIds,
        }),
      });
      const payload = (await response.json()) as QuestionResponse;

      if (!response.ok || !payload.success) {
        setError(
          payload.success
            ? "The question could not be answered."
            : payload.error.message,
        );
        return;
      }

      setEntries((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          question: trimmedQuestion,
          answer: payload.data.answer,
          citations: payload.data.citations,
        },
      ]);
      setQuestion("");
    } catch {
      setError("The question could not be answered. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="workspace-card workspace-card--conversation flex flex-col">
      <header className="card-heading">
        <span className="icon-tile assistant-icon-tile">
          <MessageSquareText aria-hidden="true" size={17} />
          <span className="assistant-icon-tile__signal" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Ask your documents
            <Sparkles aria-hidden="true" className="text-indigo-500" size={13} />
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {searchableDocuments.length} ready{" "}
            {searchableDocuments.length === 1 ? "document" : "documents"}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="assistant-scope"
          aria-label="Document question scope"
        >
          <button
            className={`assistant-scope__button ${
              searchScope === "all"
                ? "assistant-scope__button--active"
                : ""
            }`}
            type="button"
            aria-pressed={searchScope === "all"}
            onClick={() => {
              setSearchScope("all");
              setError(null);
            }}
          >
            All documents ({searchableDocuments.length})
          </button>
          <button
            className={`assistant-scope__button ${
              searchScope === "selected"
                ? "assistant-scope__button--active"
                : ""
            }`}
            type="button"
            aria-pressed={searchScope === "selected"}
            onClick={() => {
              setSearchScope("selected");
              setError(null);
            }}
          >
            Selected document
          </button>
        </div>

        <div
          className="assistant-conversation flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5"
          aria-busy={isLoading}
          aria-label="Document conversation"
          aria-live="polite"
          tabIndex={0}
        >
          {entries.length === 0 ? (
            <div className="assistant-empty my-auto px-2 text-center">
              <span className="assistant-empty__icon">
                {canSearch ? (
                  <Sparkles aria-hidden="true" size={23} />
                ) : (
                  <BookOpenCheck aria-hidden="true" size={23} />
                )}
              </span>
              <h3 className="mt-5 text-sm font-semibold text-slate-800">
                {canSearch
                  ? searchScope === "all"
                    ? "Ask across every document"
                    : "Ask about the selected document"
                  : searchScope === "selected" && searchableDocuments.length > 0
                    ? "Select a ready document"
                    : "Add a document first"}
              </h3>
              <p className="mx-auto mt-2 max-w-64 text-xs leading-5 text-slate-500">
                {canSearch
                  ? "Answers use your uploaded documents and include sources."
                  : searchScope === "selected" && searchableDocuments.length > 0
                    ? "Choose a ready document, or switch to all documents."
                    : "Upload a PDF, Word file, text file, scan, or image to begin."}
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="assistant-exchange space-y-3">
                <div
                  className="assistant-message assistant-message--user ml-auto"
                  dir="auto"
                >
                  {entry.question}
                </div>
                <div className="assistant-message assistant-message--gemini">
                  <div className="assistant-message__identity">
                    <span>
                      <Sparkles aria-hidden="true" size={11} />
                    </span>
                    Gemini
                  </div>
                  <p
                    className="assistant-answer whitespace-pre-wrap"
                    dir="auto"
                  >
                    {entry.answer}
                  </p>
                  {entry.citations.length > 0 ? (
                    <div className="assistant-sources mt-3">
                      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.11em] text-slate-500">
                        Sources
                      </p>
                      <div className="space-y-2">
                        {entry.citations.map((citation, index) => (
                          <div
                            key={`${entry.id}-citation-${index}`}
                            className="assistant-source"
                          >
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                              <FileText
                                aria-hidden="true"
                                className="shrink-0"
                                size={13}
                              />
                              <span className="truncate">
                                {citation.fileName ?? "Uploaded document"}
                              </span>
                              {citation.pageNumber ? (
                                <span className="shrink-0 text-slate-500">
                                  · page {citation.pageNumber}
                                </span>
                              ) : null}
                            </p>
                            {citation.excerpt ? (
                              <p
                                className="mt-1.5 line-clamp-3 text-start text-xs leading-5 text-slate-600"
                                dir="auto"
                              >
                                {citation.excerpt}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {isLoading ? (
            <div className="assistant-thinking" role="status">
              <span className="assistant-thinking__mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>Reviewing relevant sources…</span>
            </div>
          ) : null}
          {error ? (
            <p className="assistant-error" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
              {error}
            </p>
          ) : null}
        </div>

        <form className="assistant-composer" onSubmit={askQuestion}>
          <label className="sr-only" htmlFor="document-question">
            Question about the documents
          </label>
          <div className="assistant-composer__field">
            <Search aria-hidden="true" className="shrink-0 text-slate-400" size={16} />
            <input
              id="document-question"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
              placeholder={
                searchScope === "all"
                  ? "Ask across all documents…"
                  : "Ask about this document…"
              }
              dir="auto"
              value={question}
              maxLength={500}
              disabled={!canSearch || isLoading}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              aria-label="Ask Gemini"
              className="assistant-composer__send"
              type="submit"
              disabled={!canSearch || !question.trim() || isLoading}
            >
              {isLoading ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
              ) : (
                <ArrowUp aria-hidden="true" size={17} />
              )}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
