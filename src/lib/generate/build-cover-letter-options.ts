import { resolveCoverLetterModelTierForDraft } from "@/lib/ai/model-tier-storage";
import { resolveCompanyNameForGeneration } from "@/lib/company-context/build-company-context";
import type { ModelTier } from "@/lib/ai/model-tiers";
import type { CompanyContext } from "@/types/company-context";
import type { CoverLetterGenerationOptions } from "@/lib/generate/cover-letter-generation";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export type CoverLetterFieldInput = {
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
};

export function buildCoverLetterGenerationOptions(input: {
  job: StoredJobDescription;
  resumeDraft: GeneratedResumeDraftRecord;
  inventory?: InventoryState;
  applicationId?: string;
  fields: CoverLetterFieldInput;
  savedCompanyContext?: CompanyContext | null;
  coverLetterModelTier?: ModelTier;
}): CoverLetterGenerationOptions {
  const coverLetterModelTier =
    input.coverLetterModelTier ??
    resolveCoverLetterModelTierForDraft({
      draftTier: input.resumeDraft.inputSnapshot?.coverLetterModelTier,
    });

  return {
    job: input.job,
    resumeDraft: input.resumeDraft,
    inventory: input.inventory,
    applicationId: input.applicationId,
    savedCompanyContext: input.savedCompanyContext,
    companyName: resolveCompanyNameForGeneration({
      jobCompanyName: input.job.companyName,
      jobDescriptionText: input.job.rawText,
    }),
    country: input.fields.country?.trim() || "Singapore",
    companyWebsite: input.fields.companyWebsite?.trim() || undefined,
    additionalInstructions: input.fields.additionalInstructions,
    coverLetterModelTier,
  };
}

export function readCoverLetterFieldsFromJobForm(
  _jobForm: JobDescriptionInput,
  overrides: CoverLetterFieldInput,
): CoverLetterFieldInput {
  return {
    country: overrides.country ?? "Singapore",
    companyWebsite: overrides.companyWebsite,
    additionalInstructions: overrides.additionalInstructions,
  };
}
