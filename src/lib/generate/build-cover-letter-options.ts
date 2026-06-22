import { resolveCompanyNameForGeneration } from "@/lib/company-context/build-company-context";
import type { CompanyContext } from "@/types/company-context";
import type { CoverLetterGenerationOptions } from "@/lib/generate/cover-letter-generation";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export type CoverLetterFieldInput = {
  companyNameOverride?: string;
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  jobFormCompanyName?: string;
};

export function buildCoverLetterGenerationOptions(input: {
  job: StoredJobDescription;
  resumeDraft: GeneratedResumeDraftRecord;
  applicationId?: string;
  fields: CoverLetterFieldInput;
  savedCompanyContext?: CompanyContext | null;
}): CoverLetterGenerationOptions {
  return {
    job: input.job,
    resumeDraft: input.resumeDraft,
    applicationId: input.applicationId,
    savedCompanyContext: input.savedCompanyContext,
    companyName: resolveCompanyNameForGeneration({
      override: input.fields.companyNameOverride || input.fields.jobFormCompanyName,
      jobCompanyName: input.job.companyName,
      jobDescriptionText: input.job.rawText,
    }),
    country: input.fields.country?.trim() || "Singapore",
    companyWebsite: input.fields.companyWebsite?.trim() || undefined,
    additionalInstructions: input.fields.additionalInstructions,
  };
}

export function readCoverLetterFieldsFromJobForm(
  jobForm: JobDescriptionInput,
  overrides: CoverLetterFieldInput,
): CoverLetterFieldInput {
  return {
    companyNameOverride: overrides.companyNameOverride,
    country: overrides.country ?? "Singapore",
    companyWebsite: overrides.companyWebsite,
    additionalInstructions: overrides.additionalInstructions,
    jobFormCompanyName: jobForm.companyName,
  };
}
