import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildExportResumeDocumentModel,
  findReferenceResumeInInventory,
} from "@/lib/resume-draft/build-export-document-model";
import type { ResumeDocumentModel, ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { getJobDescriptionForUser } from "@/lib/supabase/job-descriptions";
import { getResumeInventoryForUser } from "@/lib/supabase/resume-inventories";
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

  const documentModel = buildExportResumeDocumentModel({
    draft,
    jobDescription,
    referenceResume,
    layoutSettings,
  });

  return { draft, documentModel };
}
