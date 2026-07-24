export type DocumentStatus = "READY" | "FAILED";

export type UploadedDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  createdAt: number;
};

export type DocumentUploadSuccessResponse = {
  success: true;
  data: { document: UploadedDocument };
};

export type DocumentUploadErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    documentId?: string;
  };
};

export type DocumentUploadResponse =
  | DocumentUploadSuccessResponse
  | DocumentUploadErrorResponse;

export type DocumentDetails = UploadedDocument & {
  errorMessage: string | null;
  aiSummary?: string;
};

export type DocumentDetailsResponse =
  | { success: true; data: { document: DocumentDetails } }
  | DocumentUploadErrorResponse;

export type DocumentDeleteResponse =
  | { success: true; data: { id: string } }
  | DocumentUploadErrorResponse;

export type QuestionResponse =
  | {
      success: true;
      data: {
        answer: string;
        citations: Array<{
          fileName?: string;
          pageNumber?: number;
          excerpt?: string;
        }>;
      };
    }
  | DocumentUploadErrorResponse;
