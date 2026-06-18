export type GeneratedDocumentType =
  | "resume_docx"
  | "resume_pdf"
  | "cover_letter_docx"
  | "cover_letter_pdf";

export type StoredOriginalResumeFile = {
  id: string;
  resumeId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  fileHash?: string;
  blob: Blob;
};

export type StoredGeneratedDocument = {
  id: string;
  applicationId?: string;
  documentType: GeneratedDocumentType;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  sourceDraftId?: string;
  blob: Blob;
};

export type OriginalResumeFileMetadata = {
  id?: string;
  resumeId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  fileHash?: string;
};

export type GeneratedDocumentMetadata = {
  id?: string;
  applicationId?: string;
  documentType: GeneratedDocumentType;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  sourceDraftId?: string;
};

export type OriginalResumeFileListItem = Omit<StoredOriginalResumeFile, "blob">;

export type GeneratedDocumentListItem = Omit<StoredGeneratedDocument, "blob">;

export type OriginalResumeFileStorageStats = {
  count: number;
  totalBytes: number;
  files: OriginalResumeFileListItem[];
};
