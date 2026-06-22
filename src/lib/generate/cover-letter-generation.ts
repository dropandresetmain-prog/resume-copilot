import { resolveCompanyNameForGeneration } from "@/lib/company-context/build-company-context";
import { resolveCompanyContextForGeneration } from "@/lib/company-context/resolve-for-generation";
import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import { requestCoverLetterGeneration } from "@/lib/cover-letter/client";
import { buildResumeEvidenceSpine } from "@/lib/cover-letter/resume-evidence";
import { getApplicationCommunicationProfileFromCloud } from "@/lib/supabase/application-communication-profiles";
import { createGeneratedCoverLetterDraftInCloud } from "@/lib/supabase/generated-cover-letter-drafts";
import type { CompanyContext } from "@/types/company-context";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export type CoverLetterGenerationOptions = {
  job: StoredJobDescription;
  resumeDraft: GeneratedResumeDraftRecord;
  applicationId?: string;
  companyName?: string;
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  savedCompanyContext?: CompanyContext | null;
};

export function resolveCoverLetterCompanyNames(options: CoverLetterGenerationOptions): {
  companyNameRaw: string;
  companyDisplayName: string;
} {
  const companyNameRaw = resolveCompanyNameForGeneration({
    override: options.companyName,
    jobCompanyName: options.job.companyName,
    jobDescriptionText: options.job.rawText,
  });
  return {
    companyNameRaw,
    companyDisplayName: normalizeCompanyDisplayName(companyNameRaw),
  };
}

export async function generateAndSaveCoverLetterDraft(
  options: CoverLetterGenerationOptions,
): Promise<GeneratedCoverLetterDraftRecord> {
  const profile = await getApplicationCommunicationProfileFromCloud();
  const { companyNameRaw, companyDisplayName } = resolveCoverLetterCompanyNames(options);
  const country = options.country?.trim() || "Singapore";
  const companyWebsite = options.companyWebsite?.trim() || options.job.jobUrl?.trim();
  const companyContext = resolveCompanyContextForGeneration({
    savedContext: options.savedCompanyContext,
    input: {
      companyName: companyNameRaw,
      country,
      website: companyWebsite,
      jobDescriptionText: options.job.rawText,
      roleTitle: options.job.roleTitle,
      additionalInstructions: options.additionalInstructions,
    },
  });

  const response = await requestCoverLetterGeneration({
    jobDescription: {
      id: options.job.id,
      rawText: options.job.rawText,
      companyName: options.job.companyName,
      roleTitle: options.job.roleTitle,
      jobUrl: options.job.jobUrl,
    },
    resumeDraftId: options.resumeDraft.id,
    resumeEvidenceSpine: buildResumeEvidenceSpine(options.resumeDraft),
    targetRoleTitle: options.resumeDraft.content.targetRoleTitle,
    communicationProfile: profile?.content ?? "",
    companyName: companyDisplayName,
    companyDisplayName,
    companyNameRaw,
    country,
    companyWebsite,
    additionalInstructions: options.additionalInstructions,
    companyContext,
  });

  return createGeneratedCoverLetterDraftInCloud({
    applicationId: options.applicationId,
    jobDescriptionId: options.job.id,
    resumeDraftId: options.resumeDraft.id,
    companyName: companyNameRaw,
    country,
    companyWebsite,
    additionalInstructions: options.additionalInstructions,
    companyContext,
    body: response.formalContent,
    rationale: response.rationale,
    provider: response.provider,
    modelName: response.modelName,
  });
}
