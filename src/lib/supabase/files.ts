import { computeFileHash } from "@/lib/storage/file-hash";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  GENERATED_DOCUMENTS_BUCKET,
  ORIGINAL_RESUME_BUCKET,
  type StoredFileRecord,
  type StoredFileRow,
} from "@/lib/supabase/types";
import type { GeneratedDocumentType } from "@/types/files";

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

function buildStoragePath(userId: string, fileId: string, fileName: string): string {
  return `${userId}/${fileId}/${fileName}`;
}

export async function listStoredFilesFromCloud(): Promise<StoredFileRecord[]> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("stored_files")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as StoredFileRow[]).map(mapStoredFileRow);
}

export type UploadOriginalResumeFileMetadata = {
  resumeId?: string;
  resumeInventoryId?: string;
  fileName: string;
  fileType?: string;
};

export async function uploadOriginalResumeFileToCloud(
  file: File,
  metadata: UploadOriginalResumeFileMetadata,
): Promise<{ record: StoredFileRecord; warning: string | null }> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const fileHash = await computeFileHash(file);

  const { data: duplicateRows, error: duplicateError } = await supabase
    .from("stored_files")
    .select("*")
    .eq("user_id", user.id)
    .eq("file_hash", fileHash)
    .eq("bucket", ORIGINAL_RESUME_BUCKET)
    .limit(1);

  if (duplicateError) {
    throw new Error(duplicateError.message);
  }

  const duplicate = (duplicateRows?.[0] as StoredFileRow | undefined) ?? undefined;
  if (duplicate) {
    return {
      record: mapStoredFileRow(duplicate),
      warning:
        "Duplicate file content detected. Reused the existing stored original file record.",
    };
  }

  const fileId = crypto.randomUUID();
  const storagePath = buildStoragePath(user.id, fileId, metadata.fileName);
  const { error: uploadError } = await supabase.storage
    .from(ORIGINAL_RESUME_BUCKET)
    .upload(storagePath, file, {
      contentType:
        metadata.fileType ||
        file.type ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from("stored_files")
    .insert({
      id: fileId,
      user_id: user.id,
      resume_inventory_id: metadata.resumeInventoryId ?? null,
      document_type: "original_resume",
      bucket: ORIGINAL_RESUME_BUCKET,
      storage_path: storagePath,
      file_name: metadata.fileName,
      file_type:
        metadata.fileType ||
        file.type ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_size: file.size,
      file_hash: fileHash,
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(ORIGINAL_RESUME_BUCKET).remove([storagePath]);
    throw new Error(error?.message ?? "Failed to save original resume file metadata.");
  }

  return {
    record: mapStoredFileRow(data as StoredFileRow),
    warning: null,
  };
}

export type UploadGeneratedDocumentMetadata = {
  applicationId?: string;
  documentType: GeneratedDocumentType;
  fileName: string;
  fileType?: string;
  sourceDraftId?: string;
};

export async function uploadGeneratedDocumentToCloud(
  blob: Blob,
  metadata: UploadGeneratedDocumentMetadata,
): Promise<StoredFileRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const fileId = crypto.randomUUID();
  const storagePath = buildStoragePath(user.id, fileId, metadata.fileName);
  const bucket = GENERATED_DOCUMENTS_BUCKET;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, {
      contentType: metadata.fileType || blob.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from("stored_files")
    .insert({
      id: fileId,
      user_id: user.id,
      application_id: metadata.applicationId ?? null,
      document_type: metadata.documentType,
      bucket,
      storage_path: storagePath,
      file_name: metadata.fileName,
      file_type: metadata.fileType || blob.type || null,
      file_size: blob.size,
      file_hash: await computeFileHash(blob),
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(error?.message ?? "Failed to save generated document metadata.");
  }

  return mapStoredFileRow(data as StoredFileRow);
}

export async function downloadStoredFileFromCloud(
  storedFile: StoredFileRecord,
): Promise<Blob> {
  const user = await getCurrentUser();
  if (storedFile.userId !== user.id) {
    throw new Error("You do not have access to this stored file.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(storedFile.bucket)
    .download(storedFile.storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download stored file.");
  }

  return data;
}

export async function deleteStoredFileFromCloud(id: string): Promise<void> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("stored_files")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return;
  }

  const row = data as StoredFileRow;
  const { error: storageError } = await supabase.storage
    .from(row.bucket)
    .remove([row.storage_path]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: deleteError } = await supabase
    .from("stored_files")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

export async function getOriginalResumeFileStorageStats(): Promise<{
  count: number;
  totalBytes: number;
  files: StoredFileRecord[];
}> {
  const files = (await listStoredFilesFromCloud()).filter(
    (file) => file.bucket === ORIGINAL_RESUME_BUCKET,
  );
  return {
    count: files.length,
    totalBytes: files.reduce((total, file) => total + (file.fileSize ?? 0), 0),
    files,
  };
}
