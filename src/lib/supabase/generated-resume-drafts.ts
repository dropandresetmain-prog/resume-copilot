import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { GeneratedResumeDraftRow } from "@/lib/supabase/types";
import type { AIProviderId } from "@/types/enrichment";
import {
  RESUME_DRAFT_SCHEMA_VERSION,
  type CreateGeneratedResumeDraftInput,
  type GeneratedResumeDraftRecord,
  type ResumeDraftContent,
  type ResumeDraftInputSnapshot,
  type ResumeDraftRationale,
} from "@/types/resume-draft";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResumeDraftContent(value: unknown): ResumeDraftContent | null {
  if (!isObject(value)) return null;
  if (value.schemaVersion !== RESUME_DRAFT_SCHEMA_VERSION) return null;
  if (!isObject(value.header)) return null;

  const raw = value as Record<string, unknown>;
  if (!isObject(raw.professionalSummary)) {
    raw.professionalSummary = { text: "", jdAlignment: [], riskFlags: [] };
  }

  return raw as unknown as ResumeDraftContent;
}

function parseResumeDraftRationale(value: unknown): ResumeDraftRationale | undefined {
  if (!isObject(value)) return undefined;
  if (typeof value.overall !== "string") return undefined;
  return {
    overall: value.overall,
    toneNotes: typeof value.toneNotes === "string" ? value.toneNotes : undefined,
    omissions: Array.isArray(value.omissions)
      ? value.omissions.filter((item): item is string => typeof item === "string")
      : [],
    keywordUsage: Array.isArray(value.keywordUsage)
      ? value.keywordUsage.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function parseInputSnapshot(value: unknown): ResumeDraftInputSnapshot | undefined {
  if (!isObject(value)) return undefined;
  if (value.schemaVersion !== RESUME_DRAFT_SCHEMA_VERSION) return undefined;
  if (typeof value.jobDescriptionId !== "string") return undefined;
  if (typeof value.referenceResumeId !== "string") return undefined;
  return value as unknown as ResumeDraftInputSnapshot;
}

export function mapGeneratedResumeDraftRow(
  row: GeneratedResumeDraftRow,
): GeneratedResumeDraftRecord | null {
  const content = parseResumeDraftContent(row.content);
  if (!content) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id ?? undefined,
    jobDescriptionId: row.job_description_id ?? undefined,
    referenceResumeId: row.reference_resume_id ?? undefined,
    content,
    rationale: parseResumeDraftRationale(row.rationale),
    inputSnapshot: parseInputSnapshot(row.input_snapshot),
    provider: (row.provider as AIProviderId | null) ?? undefined,
    modelName: row.model_name ?? undefined,
    status: row.status,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGeneratedResumeDraftInCloud(
  input: CreateGeneratedResumeDraftInput,
): Promise<GeneratedResumeDraftRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_resume_drafts")
    .insert({
      user_id: user.id,
      job_description_id: input.jobDescriptionId,
      reference_resume_id: input.referenceResumeId,
      application_id: null,
      content: input.content,
      rationale: input.rationale,
      input_snapshot: input.inputSnapshot,
      provider: input.provider,
      model_name: input.modelName ?? null,
      status: input.status ?? "generated",
      schema_version: String(RESUME_DRAFT_SCHEMA_VERSION),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save generated resume draft.");
  }

  const mapped = mapGeneratedResumeDraftRow(data as GeneratedResumeDraftRow);
  if (!mapped) {
    throw new Error("Saved generated resume draft has invalid content.");
  }

  return mapped;
}

export async function listGeneratedResumeDraftsFromCloud(options?: {
  jobDescriptionId?: string;
}): Promise<GeneratedResumeDraftRecord[]> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  let query = supabase
    .from("generated_resume_drafts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (options?.jobDescriptionId) {
    query = query.eq("job_description_id", options.jobDescriptionId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as GeneratedResumeDraftRow[])
    .map((row) => mapGeneratedResumeDraftRow(row))
    .filter((row): row is GeneratedResumeDraftRecord => row !== null);
}

export async function getGeneratedResumeDraftFromCloud(
  id: string,
): Promise<GeneratedResumeDraftRecord | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  return getGeneratedResumeDraftForUser(supabase, id, user.id);
}

export async function getGeneratedResumeDraftForUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  id: string,
  userId: string,
): Promise<GeneratedResumeDraftRecord | null> {
  const { data, error } = await supabase
    .from("generated_resume_drafts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapGeneratedResumeDraftRow(data as GeneratedResumeDraftRow);
}

export type UpdateGeneratedResumeDraftInput = {
  content: ResumeDraftContent;
  status?: string;
};

/**
 * Persist generated draft edits only (`generated_resume_drafts`).
 * Draft-specific mutation — source inventory, parsed bullets, collated inventory,
 * approved keyword bank, and enrichment state must remain unchanged.
 */
export async function updateGeneratedResumeDraftInCloud(
  id: string,
  input: UpdateGeneratedResumeDraftInput,
): Promise<GeneratedResumeDraftRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_resume_drafts")
    .update({
      content: input.content,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update generated resume draft.");
  }

  const mapped = mapGeneratedResumeDraftRow(data as GeneratedResumeDraftRow);
  if (!mapped) {
    throw new Error("Updated generated resume draft has invalid content.");
  }

  return mapped;
}

/** Removes one generated draft row only — never touches `resume_inventories`. */
export async function deleteGeneratedResumeDraftFromCloud(id: string): Promise<void> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("generated_resume_drafts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
