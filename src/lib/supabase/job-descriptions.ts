import {
  findDuplicateJobDescription,
  normalizeJobDescriptionField,
  normalizeJobDescriptionRawText,
} from "@/lib/jd/persistence";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { JobDescriptionRow } from "@/lib/supabase/types";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

function mapJobDescriptionRow(row: JobDescriptionRow): StoredJobDescription {
  return {
    id: row.id,
    rawText: row.raw_text,
    companyName: row.company_name ?? undefined,
    roleTitle: row.role_title ?? undefined,
    jobUrl: row.job_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertPayload(input: JobDescriptionInput) {
  return {
    raw_text: input.rawText.trim(),
    company_name: input.companyName?.trim() || null,
    role_title: input.roleTitle?.trim() || null,
    job_url: input.jobUrl?.trim() || null,
  };
}

export async function listJobDescriptionsFromCloud(): Promise<StoredJobDescription[]> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_descriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as JobDescriptionRow[]).map(mapJobDescriptionRow);
}

export async function createJobDescriptionInCloud(
  input: JobDescriptionInput,
  options?: { allowDuplicate?: boolean },
): Promise<StoredJobDescription> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  if (!options?.allowDuplicate) {
    const existing = await listJobDescriptionsFromCloud();
    const duplicate = findDuplicateJobDescription(existing, input);
    if (duplicate) {
      throw new Error(
        `A similar saved job already exists (${duplicate.roleTitle ?? duplicate.companyName ?? "saved job"}).`,
      );
    }
  }

  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      user_id: user.id,
      ...toInsertPayload(input),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save job description.");
  }

  return mapJobDescriptionRow(data as JobDescriptionRow);
}

export async function updateJobDescriptionInCloud(
  id: string,
  input: JobDescriptionInput,
  options?: { allowDuplicate?: boolean },
): Promise<StoredJobDescription> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  if (!options?.allowDuplicate) {
    const existing = await listJobDescriptionsFromCloud();
    const duplicate = findDuplicateJobDescription(existing, input, id);
    if (duplicate) {
      throw new Error(
        `A similar saved job already exists (${duplicate.roleTitle ?? duplicate.companyName ?? "saved job"}).`,
      );
    }
  }

  const { data, error } = await supabase
    .from("job_descriptions")
    .update({
      ...toInsertPayload(input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update job description.");
  }

  return mapJobDescriptionRow(data as JobDescriptionRow);
}

export async function deleteJobDescriptionFromCloud(id: string): Promise<void> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("job_descriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearJobDescriptionsFromCloud(): Promise<void> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("job_descriptions")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export function jobDescriptionFingerprint(input: JobDescriptionInput): string {
  return [
    normalizeJobDescriptionRawText(input.rawText),
    normalizeJobDescriptionField(input.companyName),
    normalizeJobDescriptionField(input.roleTitle),
  ].join("::");
}
