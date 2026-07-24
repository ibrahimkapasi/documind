export type DocumentFileType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export interface DocumentSummary {
  id: string;
  name: string;
  mimeType: DocumentFileType;
  createdAt: string;
}
