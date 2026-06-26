import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { GeneratedCoverLetterDraftRow } from "@/lib/supabase/types";
import { normalizeCompanyContext } from "@/lib/company-context/normalize";
import type { CompanyContext } from "@/types/company-context";
import type { AIProviderId } from "@/types/enrichment";
import type {
  CoverLetterRationale,
  CreateGeneratedCoverLetterDraftInput,
  GeneratedCoverLetterDraftRecord,
} from "@/types/cover-letter-draft";
import type { ModelTier } from "@/lib/ai/model-tiers";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCompanyContext(value: unknown): CompanyContext | undefined {
  return normalizeCompanyContext(value) ?? undefined;
}

function parseCoverLetterRationale(value: unknown): CoverLetterRationale | undefined {
  if (!isObject(value) || typeof value.wordCount !== "number") {
    return undefined;
  }

  return {
    selectedThemes: Array.isArray(value.selectedThemes)
      ? value.selectedThemes.filter((item): item is string => typeof item === "string")
      : [],
    whyTheseThemes:
      typeof value.whyTheseThemes === "string" ? value.whyTheseThemes : "",
    companyContextUsed: Array.isArray(value.companyContextUsed)
      ? value.companyContextUsed.filter((item): item is string => typeof item === "string")
      : [],
    riskFlags: Array.isArray(value.riskFlags)
      ? value.riskFlags.filter((item): item is string => typeof item === "string")
      : [],
    wordCount: value.wordCount,
    emailCoverLetter:
      typeof value.emailCoverLetter === "string" ? value.emailCoverLetter : "",
    linkedinMessage:
      typeof value.linkedinMessage === "string" ? value.linkedinMessage : "",
    recruiterDm: typeof value.recruiterDm === "string" ? value.recruiterDm : "",
    whatsappIntro:
      typeof value.whatsappIntro === "string" ? value.whatsappIntro : "",
    modelSelection:
      isObject(value.modelSelection) &&
      typeof value.modelSelection.requestedTier === "string"
        ? {
            requestedTier: value.modelSelection.requestedTier as ModelTier,
            fallbackApplied: value.modelSelection.fallbackApplied === true,
          }
        : undefined,
    selectedCompanyFacts: Array.isArray(value.selectedCompanyFacts)
      ? value.selectedCompanyFacts.filter((item): item is string => typeof item === "string")
      : undefined,
    selectedRoleRequirements: Array.isArray(value.selectedRoleRequirements)
      ? value.selectedRoleRequirements.filter((item): item is string => typeof item === "string")
      : undefined,
    companyRoleStoryBridges: Array.isArray(value.companyRoleStoryBridges)
      ? value.companyRoleStoryBridges.filter((item): item is string => typeof item === "string")
      : undefined,
    storySpinePrompt:
      typeof value.storySpinePrompt === "string" ? value.storySpinePrompt : undefined,
  };
}

export function mapGeneratedCoverLetterDraftRow(
  row: GeneratedCoverLetterDraftRow,
): GeneratedCoverLetterDraftRecord {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id ?? undefined,
    jobDescriptionId: row.job_description_id ?? undefined,
    resumeDraftId: row.resume_draft_id ?? undefined,
    companyName: row.company_name ?? undefined,
    country: row.country ?? undefined,
    companyWebsite: row.company_website ?? undefined,
    additionalInstructions: row.additional_instructions ?? undefined,
    companyContext: parseCompanyContext(row.company_context),
    body: row.body,
    rationale: parseCoverLetterRationale(row.rationale),
    provider: (row.provider as AIProviderId | null) ?? undefined,
    modelName: row.model_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGeneratedCoverLetterDraftInCloud(
  input: CreateGeneratedCoverLetterDraftInput,
): Promise<GeneratedCoverLetterDraftRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .insert({
      user_id: user.id,
      application_id: input.applicationId ?? null,
      job_description_id: input.jobDescriptionId,
      resume_draft_id: input.resumeDraftId,
      company_name: input.companyName ?? null,
      country: input.country ?? null,
      company_website: input.companyWebsite ?? null,
      additional_instructions: input.additionalInstructions ?? null,
      company_context: input.companyContext ?? null,
      body: input.body,
      rationale: input.rationale,
      provider: input.provider,
      model_name: input.modelName ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save generated cover letter draft.");
  }

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}

export async function listGeneratedCoverLetterDraftsFromCloud(): Promise<
  GeneratedCoverLetterDraftRecord[]
> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as GeneratedCoverLetterDraftRow[]).map(mapGeneratedCoverLetterDraftRow);
}

export async function getGeneratedCoverLetterDraftFromCloud(
  id: string,
): Promise<GeneratedCoverLetterDraftRecord | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}

export async function getGeneratedCoverLetterDraftForUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  id: string,
  userId: string,
): Promise<GeneratedCoverLetterDraftRecord | null> {
  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
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

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}

/** Full in-place replacement after cover letter regeneration — preserves draft id and links. */
export async function replaceGeneratedCoverLetterDraftInCloud(
  id: string,
  input: CreateGeneratedCoverLetterDraftInput,
): Promise<GeneratedCoverLetterDraftRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .update({
      application_id: input.applicationId ?? null,
      job_description_id: input.jobDescriptionId,
      resume_draft_id: input.resumeDraftId,
      company_name: input.companyName ?? null,
      country: input.country ?? null,
      company_website: input.companyWebsite ?? null,
      additional_instructions: input.additionalInstructions ?? null,
      company_context: input.companyContext ?? null,
      body: input.body,
      rationale: input.rationale,
      provider: input.provider,
      model_name: input.modelName ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to replace cover letter draft.");
  }

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}

export async function updateGeneratedCoverLetterDraftInCloud(
  id: string,
  input: { body: string; rationale?: CoverLetterRationale },
): Promise<GeneratedCoverLetterDraftRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const updatePayload: Record<string, unknown> = {
    body: input.body,
    updated_at: new Date().toISOString(),
  };
  if (input.rationale) {
    updatePayload.rationale = {
      ...input.rationale,
      wordCount: countWords(input.body),
    };
  }

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update cover letter draft.");
  }

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}

export async function updateGeneratedCoverLetterDraftInCloudForUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  id: string,
  userId: string,
  input: { body: string; rationale?: CoverLetterRationale; modelName?: string },
): Promise<GeneratedCoverLetterDraftRecord | null> {
  const updatePayload: Record<string, unknown> = {
    body: input.body,
    updated_at: new Date().toISOString(),
  };
  if (input.modelName) {
    updatePayload.model_name = input.modelName;
  }
  if (input.rationale) {
    updatePayload.rationale = {
      ...input.rationale,
      wordCount: countWords(input.body),
    };
  }

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function findCoverLetterDraftByResumeDraftId(
  resumeDraftId: string,
): Promise<GeneratedCoverLetterDraftRecord | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("generated_cover_letter_drafts")
    .select("*")
    .eq("user_id", user.id)
    .eq("resume_draft_id", resumeDraftId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapGeneratedCoverLetterDraftRow(data as GeneratedCoverLetterDraftRow);
}
