import { normalizeCompanyContext } from "@/lib/company-context/normalize";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ApplicationRecordRow } from "@/lib/supabase/types";
import {
  normalizeApplicationRecordStatus,
  type ApplicationRecordInput,
  type ApplicationRecordStatus,
  type StoredApplicationRecord,
} from "@/types/application-record";
import type { StoredJobDescription } from "@/types/jd";
import type { CompanyContext } from "@/types/company-context";

function mapApplicationRecordRow(row: ApplicationRecordRow): StoredApplicationRecord {
  const companyContext = normalizeCompanyContext(row.company_context, {
    companyName: row.company_name ?? undefined,
  }) ?? undefined;

  return {
    id: row.id,
    jobDescriptionId: row.job_description_id ?? undefined,
    companyName: row.company_name ?? undefined,
    roleTitle: row.role_title ?? undefined,
    jobUrl: row.job_url ?? undefined,
    status: normalizeApplicationRecordStatus(row.status),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    appliedAt: row.applied_at ?? undefined,
    companyContext,
    companyContextUpdatedAt: row.company_context_updated_at ?? undefined,
  };
}

function toInsertPayload(input: ApplicationRecordInput) {
  return {
    job_description_id: input.jobDescriptionId ?? null,
    company_name: input.companyName?.trim() || null,
    role_title: input.roleTitle?.trim() || null,
    job_url: input.jobUrl?.trim() || null,
    status: input.status ?? "drafting",
    notes: input.notes?.trim() || null,
  };
}

export function applicationRecordFromJobDescription(
  job: StoredJobDescription,
  overrides?: Partial<ApplicationRecordInput>,
): ApplicationRecordInput {
  return {
    jobDescriptionId: job.id,
    companyName: job.companyName,
    roleTitle: job.roleTitle,
    jobUrl: job.jobUrl,
    status: "drafting",
    ...overrides,
  };
}

export async function listApplicationRecordsFromCloud(): Promise<StoredApplicationRecord[]> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("application_records")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ApplicationRecordRow[]).map(mapApplicationRecordRow);
}

export async function findApplicationRecordByJobDescriptionId(
  jobDescriptionId: string,
): Promise<StoredApplicationRecord | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("application_records")
    .select("*")
    .eq("user_id", user.id)
    .eq("job_description_id", jobDescriptionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapApplicationRecordRow(data as ApplicationRecordRow);
}

export async function getApplicationRecordFromCloud(
  id: string,
): Promise<StoredApplicationRecord | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("application_records")
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

  return mapApplicationRecordRow(data as ApplicationRecordRow);
}

export async function createApplicationRecordInCloud(
  input: ApplicationRecordInput,
): Promise<StoredApplicationRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("application_records")
    .insert({
      user_id: user.id,
      ...toInsertPayload(input),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create application record.");
  }

  return mapApplicationRecordRow(data as ApplicationRecordRow);
}

export type UpdateApplicationRecordInput = {
  status?: ApplicationRecordStatus;
  notes?: string;
  jobUrl?: string;
  companyName?: string;
  roleTitle?: string;
  appliedAt?: string | null;
  companyContext?: CompanyContext | null;
};

export async function updateApplicationRecordInCloud(
  id: string,
  input: UpdateApplicationRecordInput,
): Promise<StoredApplicationRecord> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) {
    updatePayload.status = input.status;
    if (input.status === "applied" && input.appliedAt !== null) {
      updatePayload.applied_at = input.appliedAt ?? new Date().toISOString();
    }
    if (input.status !== "applied" && input.appliedAt === null) {
      updatePayload.applied_at = null;
    }
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes.trim() || null;
  }
  if (input.jobUrl !== undefined) {
    updatePayload.job_url = input.jobUrl.trim() || null;
  }
  if (input.companyName !== undefined) {
    updatePayload.company_name = input.companyName.trim() || null;
  }
  if (input.roleTitle !== undefined) {
    updatePayload.role_title = input.roleTitle.trim() || null;
  }
  if (input.companyContext !== undefined) {
    updatePayload.company_context = input.companyContext;
    updatePayload.company_context_updated_at = input.companyContext
      ? new Date().toISOString()
      : null;
  }

  const { data, error } = await supabase
    .from("application_records")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update application record.");
  }

  return mapApplicationRecordRow(data as ApplicationRecordRow);
}

/** Reuse an existing application for a JD or create a new drafting record. */
export async function ensureApplicationRecordForJobDescription(
  job: StoredJobDescription,
): Promise<StoredApplicationRecord> {
  const existing = await findApplicationRecordByJobDescriptionId(job.id);
  if (existing) {
    return existing;
  }

  return createApplicationRecordInCloud(applicationRecordFromJobDescription(job));
}

export async function clearApplicationCompanyResearchInCloud(
  applicationId: string,
): Promise<StoredApplicationRecord> {
  return updateApplicationRecordInCloud(applicationId, { companyContext: null });
}

export async function saveApplicationCompanyContextInCloud(
  applicationId: string,
  companyContext: CompanyContext,
): Promise<StoredApplicationRecord> {
  return updateApplicationRecordInCloud(applicationId, { companyContext });
}

export async function markApplicationResumeGenerated(
  applicationId: string,
): Promise<StoredApplicationRecord> {
  return updateApplicationRecordInCloud(applicationId, {
    status: "resume_generated",
  });
}
