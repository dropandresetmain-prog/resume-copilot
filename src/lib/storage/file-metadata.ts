import type {
  GeneratedDocumentMetadata,
  GeneratedDocumentType,
  OriginalResumeFileListItem,
  OriginalResumeFileMetadata,
  StoredOriginalResumeFile,
} from "@/types/files";

function createId(): string {
  return crypto.randomUUID();
}

export function normalizeOriginalResumeFileMetadata(
  metadata: OriginalResumeFileMetadata,
): OriginalResumeFileMetadata {
  const fileName = metadata.fileName.trim();
  if (!fileName) {
    throw new Error("Original resume file metadata requires a file name.");
  }
  if (!Number.isFinite(metadata.fileSize) || metadata.fileSize < 0) {
    throw new Error("Original resume file metadata requires a valid file size.");
  }
  if (!metadata.uploadedAt.trim()) {
    throw new Error("Original resume file metadata requires uploadedAt.");
  }

  return {
    id: metadata.id,
    resumeId: metadata.resumeId,
    fileName,
    fileType: metadata.fileType.trim() || "application/octet-stream",
    fileSize: metadata.fileSize,
    uploadedAt: metadata.uploadedAt,
    fileHash: metadata.fileHash?.trim() || undefined,
  };
}

export function normalizeGeneratedDocumentMetadata(
  metadata: GeneratedDocumentMetadata,
): GeneratedDocumentMetadata {
  const fileName = metadata.fileName.trim();
  if (!fileName) {
    throw new Error("Generated document metadata requires a file name.");
  }
  if (!Number.isFinite(metadata.fileSize) || metadata.fileSize < 0) {
    throw new Error("Generated document metadata requires a valid file size.");
  }
  if (!metadata.createdAt.trim()) {
    throw new Error("Generated document metadata requires createdAt.");
  }

  const allowedTypes: GeneratedDocumentType[] = [
    "resume_docx",
    "resume_pdf",
    "cover_letter_docx",
    "cover_letter_pdf",
  ];
  if (!allowedTypes.includes(metadata.documentType)) {
    throw new Error(`Unsupported generated document type: ${metadata.documentType}`);
  }

  return {
    id: metadata.id,
    applicationId: metadata.applicationId,
    documentType: metadata.documentType,
    fileName,
    fileType: metadata.fileType.trim() || "application/octet-stream",
    fileSize: metadata.fileSize,
    createdAt: metadata.createdAt,
    sourceDraftId: metadata.sourceDraftId,
  };
}

export function toOriginalResumeFileListItem(
  record: StoredOriginalResumeFile,
): OriginalResumeFileListItem {
  return {
    id: record.id,
    resumeId: record.resumeId,
    fileName: record.fileName,
    fileType: record.fileType,
    fileSize: record.fileSize,
    uploadedAt: record.uploadedAt,
    fileHash: record.fileHash,
  };
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { createId };
