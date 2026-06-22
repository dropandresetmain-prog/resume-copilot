import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeCompanyContext } from "@/lib/company-context/normalize";
import {
  buildExportResumeDocumentModel,
  findReferenceResumeInInventory,
} from "@/lib/resume-draft/build-export-document-model";
import type { ResumeDocumentModel, ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { getJobDescriptionForUser } from "@/lib/supabase/job-descriptions";
import { getResumeInventoryForUser } from "@/lib/supabase/resume-inventories";
import type { CompanyContext } from "@/types/company-context";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export class ExportRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ResolvedExportRequest = {
  draft: GeneratedResumeDraftRecord;
  documentModel: ResumeDocumentModel;
};

async function loadCompanyContextForDraft(
  supabase: SupabaseClient,
  userId: string,
  applicationId?: string,
): Promise<CompanyContext | null> {
  if (!applicationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("application_records")
    .select("company_context, company_name")
    .eq("user_id", userId)
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (
    normalizeCompanyContext(data.company_context, {
      companyName: typeof data.company_name === "string" ? data.company_name : undefined,
    }) ?? null
  );
}

/** Shared draft + document model resolution for export, validate, and approve routes. */
export async function resolveExportDocumentModelForDraft(
  supabase: SupabaseClient,
  userId: string,
  draftId: string,
  layoutSettings?: Partial<ResumeLayoutSettings>,
): Promise<ResolvedExportRequest> {
  const draft = await getGeneratedResumeDraftForUser(supabase, draftId, userId);
  if (!draft) {
    throw new ExportRequestError("Resume draft not found.", 404);
  }

  const jobDescription = draft.jobDescriptionId
    ? await getJobDescriptionForUser(supabase, draft.jobDescriptionId, userId)
    : null;

  const inventory = await getResumeInventoryForUser(supabase, userId);
  const referenceResume = inventory
    ? findReferenceResumeInInventory(inventory.resumes, draft.referenceResumeId)
    : null;

  const companyContext = await loadCompanyContextForDraft(supabase, userId, draft.applicationId);

  const documentModel = buildExportResumeDocumentModel({
    draft,
    jobDescription,
    companyContext,
    referenceResume,
    layoutSettings,
  });

  return { draft, documentModel };
}
