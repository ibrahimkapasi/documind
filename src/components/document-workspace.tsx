"use client";

import { useState } from "react";

import { DocumentChat } from "@/components/document-chat";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentUpload } from "@/components/document-upload";
import type { UploadedDocument } from "@/types/document-api";

export function DocumentWorkspace() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [wasDeleted, setWasDeleted] = useState(false);

  function handleUploaded(document: UploadedDocument) {
    setDocuments((current) =>
      current.some(({ id }) => id === document.id)
        ? current
        : [...current, document],
    );
    setDocumentId((current) => current ?? document.id);
    setWasDeleted(false);
  }

  function handleDeleted(id: string) {
    const remainingDocuments = documents.filter((document) => document.id !== id);

    setDocuments(remainingDocuments);
    setDocumentId((current) =>
      current === id ? (remainingDocuments[0]?.id ?? null) : current,
    );
    setWasDeleted(remainingDocuments.length === 0);
  }

  return (
    <section
      aria-label="Document workspace"
      className="workspace-grid"
    >
      <DocumentUpload
        documents={documents}
        selectedDocumentId={documentId}
        onDocumentDeleted={handleDeleted}
        onDocumentSelected={setDocumentId}
        onUploadSuccess={handleUploaded}
      />
      <DocumentPreview
        documentId={documentId}
        wasDeleted={wasDeleted}
        onDocumentDeleted={handleDeleted}
      />
      <DocumentChat
        documents={documents}
        selectedDocumentId={documentId}
      />
    </section>
  );
}
