export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_FILE_SIZE_LABEL = "10 MB";
export const MAX_DOCUMENTS_PER_WORKSPACE = 5;

export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;
export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  DOCX_MIME_TYPE,
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const DOCUMENT_FILE_ACCEPT = [
  ...ACCEPTED_DOCUMENT_EXTENSIONS,
  ...ACCEPTED_DOCUMENT_MIME_TYPES,
].join(",");
