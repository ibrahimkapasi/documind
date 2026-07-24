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
            ? "Gemini could not answer the question."
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
      setError("Gemini could not answer the question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="workspace-card flex h-[25rem] max-h-[25rem] flex-col lg:h-[31rem] lg:max-h-[31rem]">
      <header className="card-heading">
        <span className="icon-tile">
          <MessageSquareText aria-hidden="true" size={18} />
        </span>
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Ask Gemini
            <Sparkles aria-hidden="true" className="text-indigo-500" size={14} />
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {searchableDocuments.length} AI-indexed
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50/70 p-2"
          aria-label="Document question scope"
        >
          <button
            className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
              searchScope === "all"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800"
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
            className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
              searchScope === "selected"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800"
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
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5"
          aria-live="polite"
        >
          {entries.length === 0 ? (
            <div className="my-auto px-2 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
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
                    ? "Select an AI-indexed document"
                    : "Add a document first"}
              </h3>
              <p className="mx-auto mt-2 max-w-64 text-xs leading-5 text-slate-500">
                {canSearch
                  ? "Gemini will answer from your uploaded documents and show its sources."
                  : searchScope === "selected" && searchableDocuments.length > 0
                    ? "Choose a ready document, or switch to all documents."
                    : "Upload a PDF, Word file, text file, scan, or image to begin."}
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="space-y-3">
                <div
                  className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-indigo-600 px-3 py-2.5 text-start text-sm text-white"
                  dir="auto"
                >
                  {entry.question}
                </div>
                <div className="max-w-[95%] rounded-xl rounded-bl-sm border border-slate-200 bg-slate-50 p-3">
                  <p
                    className="whitespace-pre-wrap text-start text-sm leading-6 text-slate-800"
                    dir="auto"
                  >
                    {entry.answer}
                  </p>
                  {entry.citations.length > 0 ? (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Sources
                      </p>
                      <div className="space-y-2">
                        {entry.citations.map((citation, index) => (
                          <div
                            key={`${entry.id}-citation-${index}`}
                            className="rounded-lg border border-slate-200 bg-white p-2.5"
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
            <div className="flex items-center gap-2 text-xs text-slate-500" role="status">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
              Gemini is reading the relevant sources…
            </div>
          ) : null}
          {error ? (
            <p className="flex items-start gap-2 text-xs leading-5 text-red-700" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
              {error}
            </p>
          ) : null}
        </div>

        <form className="border-t border-slate-200 p-4" onSubmit={askQuestion}>
          <label className="sr-only" htmlFor="document-question">
            Question about the documents
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <Search aria-hidden="true" className="shrink-0 text-slate-400" size={16} />
            <input
              id="document-question"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
              placeholder={
                searchScope === "all"
                  ? "Ask Gemini across all documents…"
                  : "Ask Gemini about this document…"
              }
              dir="auto"
              value={question}
              maxLength={500}
              disabled={!canSearch || isLoading}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              aria-label="Ask Gemini"
              className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
