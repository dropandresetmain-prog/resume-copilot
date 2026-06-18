import type { SupabaseClient } from "@supabase/supabase-js";

import { computeFileHash } from "@/lib/storage/file-hash";
import { buildResumePdfStoragePath } from "@/lib/resume-draft/export-filename";
import { RESUME_PDF_MIME } from "@/lib/resume-draft/pdf-export";
import { GENERATED_DOCUMENTS_BUCKET, type StoredFileRecord, type StoredFileRow } from "@/lib/supabase/types";

function mapStoredFileRow(row: StoredFileRow): StoredFileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id ?? undefined,
    resumeInventoryId: row.resume_inventory_id ?? undefined,
    documentType: row.document_type,
    bucket: row.bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileType: row.file_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    fileHash: row.file_hash ?? undefined,
    createdAt: row.created_at,
  };
}

export type UploadResumePdfExportResult = {
  storedFile: StoredFileRecord;
  signedUrl: string;
  storagePath: string;
};

/**
 * Upload generated resume PDF to `generated-documents` bucket.
 * Path: `{userId}/resumes/{draftId}/{fileName}.pdf`
 */
export async function uploadResumePdfExport(
  supabase: SupabaseClient,
  options: {
    userId: string;
    draftId: string;
    fileName: string;
    buffer: Buffer;
  },
): Promise<UploadResumePdfExportResult> {
  const storagePath = buildResumePdfStoragePath(
    options.userId,
    options.draftId,
    options.fileName,
  );
  const fileId = crypto.randomUUID();

  const { error: uploadError } = await supabase.storage
    .from(GENERATED_DOCUMENTS_BUCKET)
    .upload(storagePath, options.buffer, {
      contentType: RESUME_PDF_MIME,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const fileHash = await computeFileHash(
    new Blob([Uint8Array.from(options.buffer)], { type: RESUME_PDF_MIME }),
  );

  const { data, error } = await supabase
    .from("stored_files")
    .insert({
      id: fileId,
      user_id: options.userId,
      application_id: null,
      document_type: "resume_pdf",
      bucket: GENERATED_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      file_name: options.fileName,
      file_type: RESUME_PDF_MIME,
      file_size: options.buffer.byteLength,
      file_hash: fileHash,
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(GENERATED_DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(error?.message ?? "Failed to save exported PDF metadata.");
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(GENERATED_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    throw new Error(signedError?.message ?? "Failed to create download URL.");
  }

  return {
    storedFile: mapStoredFileRow(data as StoredFileRow),
    signedUrl: signed.signedUrl,
    storagePath,
  };
}
