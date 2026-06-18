export const ORIGINAL_RESUME_BUCKET = "original-resume-files";
export const GENERATED_DOCUMENTS_BUCKET = "generated-documents";

export type ResumeInventoryRow = {
  id: string;
  user_id: string;
  data: unknown;
  schema_version: string;
  created_at: string;
  updated_at: string;
};

export type JobDescriptionRow = {
  id: string;
  user_id: string;
  raw_text: string;
  company_name: string | null;
  role_title: string | null;
  job_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredFileRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  resume_inventory_id: string | null;
  document_type: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_hash: string | null;
  created_at: string;
};

export type StoredFileRecord = {
  id: string;
  userId: string;
  applicationId?: string;
  resumeInventoryId?: string;
  documentType: string;
  bucket: string;
  storagePath: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileHash?: string;
  createdAt: string;
};
