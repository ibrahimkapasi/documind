import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  ACCEPTED_DOCUMENT_MIME_TYPES,
  DOCX_MIME_TYPE,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_LABEL,
} from "@/config/document-upload";

export type DocumentFileValidationErrorCode =
  | "MISSING_FILE"
  | "MULTIPLE_FILES"
  | "UNSUPPORTED_EXTENSION"
  | "UNSUPPORTED_MIME_TYPE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE";

export type DocumentFileValidationResult =
  | { success: true; file: File }
  | {
      success: false;
      code: DocumentFileValidationErrorCode;
      message: string;
      file?: File;
    };

export function validateDocumentFiles(files: readonly File[]): DocumentFileValidationResult {
  if (files.length === 0) {
    return {
      success: false,
      code: "MISSING_FILE",
      message: "Choose a PDF, Word, TXT, PNG, JPG, or WebP file to continue.",
    };
  }

  if (files.length > 1) {
    return {
      success: false,
      code: "MULTIPLE_FILES",
      message: "Only one document can be selected at a time.",
    };
  }

  const file = files[0];
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

  if (!ACCEPTED_DOCUMENT_EXTENSIONS.some((allowed) => allowed === extension)) {
    return {
      success: false,
      code: "UNSUPPORTED_EXTENSION",
      message:
        "Unsupported file extension. Choose a .pdf, .docx, .txt, .png, .jpg, .jpeg, or .webp file.",
      file,
    };
  }

  if (!ACCEPTED_DOCUMENT_MIME_TYPES.some((allowed) => allowed === file.type)) {
    return {
      success: false,
      code: "UNSUPPORTED_MIME_TYPE",
      message:
        "Unsupported file type. Choose a PDF, Word, plain-text, PNG, JPG, or WebP file.",
      file,
    };
  }

  const extensionMatchesMimeType =
    (extension === ".pdf" && file.type === "application/pdf") ||
    (extension === ".docx" && file.type === DOCX_MIME_TYPE) ||
    (extension === ".txt" && file.type === "text/plain") ||
    (extension === ".png" && file.type === "image/png") ||
    ((extension === ".jpg" || extension === ".jpeg") &&
      file.type === "image/jpeg") ||
    (extension === ".webp" && file.type === "image/webp");

  if (!extensionMatchesMimeType) {
    return {
      success: false,
      code: "UNSUPPORTED_MIME_TYPE",
      message: "The file extension does not match the file type.",
      file,
    };
  }

  if (file.size === 0) {
    return {
      success: false,
      code: "EMPTY_FILE",
      message: "This file is empty. Choose a document that contains content.",
      file,
    };
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return {
      success: false,
      code: "FILE_TOO_LARGE",
      message: `This file is too large. The maximum size is ${MAX_DOCUMENT_FILE_SIZE_LABEL}.`,
      file,
    };
  }

  return { success: true, file };
}
