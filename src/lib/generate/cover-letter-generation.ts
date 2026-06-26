import { resolveCoverLetterModelTierForDraft } from "@/lib/ai/model-tier-storage";
import type { ModelTier } from "@/lib/ai/model-tiers";
import { resolveCompanyNameForGeneration } from "@/lib/company-context/build-company-context";
import { resolveCompanyContextForGeneration } from "@/lib/company-context/resolve-for-generation";
import { resolveCompanyDisplayNameForProse } from "@/lib/cover-letter/company-name";
import { requestCoverLetterGeneration } from "@/lib/cover-letter/client";
import { buildCoverLetterEvidencePrompt } from "@/lib/cover-letter/evidence-prompt";
import { resolveCompanyWebsiteForResearch } from "@/lib/firecrawl/url";
import { getApplicationCommunicationProfileFromCloud } from "@/lib/supabase/application-communication-profiles";
import {
  createGeneratedCoverLetterDraftInCloud,
  replaceGeneratedCoverLetterDraftInCloud,
} from "@/lib/supabase/generated-cover-letter-drafts";
import type { CompanyContext } from "@/types/company-context";
import type { StoredJobDescription } from "@/types/jd";
import type {
  CoverLetterEvidenceControls,
  GeneratedCoverLetterDraftRecord,
} from "@/types/cover-letter-draft";
import type { InventoryState } from "@/types/resume";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export const REGENERATE_COVER_LETTER_CONFIRM =
  "Regenerate the cover letter using your current Communication Profile and inventory evidence?\n\n" +
  "This is 1 AI step. Your resume draft will not change. The current cover letter will be replaced.";

export type CoverLetterGenerationOptions = {
  job: StoredJobDescription;
  resumeDraft: GeneratedResumeDraftRecord;
  inventory?: InventoryState;
  applicationId?: string;
  companyName?: string;
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  savedCompanyContext?: CompanyContext | null;
  coverLetterModelTier?: ModelTier;
  /** When set, replaces this cover letter draft in place instead of creating a new row. */
  existingCoverLetterId?: string;
  /** Pending-only proof evidence choices for regeneration (not persisted). */
  evidenceControls?: CoverLetterEvidenceControls;
};

export function resolveCoverLetterCompanyNames(
  options: CoverLetterGenerationOptions,
  savedCompanyContext?: CompanyContext | null,
): {
  companyNameRaw: string;
  companyDisplayName: string;
} {
  const companyNameRaw = resolveCompanyNameForGeneration({
    override: options.companyName,
    jobCompanyName: options.job.companyName,
    jobDescriptionText: options.job.rawText,
  });
  const website =
    resolveCompanyWebsiteForResearch(options.companyWebsite) ??
    resolveCompanyWebsiteForResearch(savedCompanyContext?.website) ??
    undefined;

  return resolveCompanyDisplayNameForProse({
    rawName: companyNameRaw,
    website: website ?? undefined,
    savedDisplayName: savedCompanyContext?.displayName,
  });
}

export async function generateAndSaveCoverLetterDraft(
  options: CoverLetterGenerationOptions,
): Promise<GeneratedCoverLetterDraftRecord> {
  const profile = await getApplicationCommunicationProfileFromCloud();
  const companyWebsite =
    resolveCompanyWebsiteForResearch(options.companyWebsite) ??
    resolveCompanyWebsiteForResearch(options.savedCompanyContext?.website) ??
    undefined;
  const { companyNameRaw, companyDisplayName } = resolveCoverLetterCompanyNames(
    options,
    options.savedCompanyContext,
  );
  const country = options.country?.trim() || "Singapore";
  const coverLetterModelTier =
    options.coverLetterModelTier ??
    resolveCoverLetterModelTierForDraft({
      draftTier: options.resumeDraft.inputSnapshot?.coverLetterModelTier,
    });
  const companyContext = resolveCompanyContextForGeneration({
    savedContext: options.savedCompanyContext,
    input: {
      companyName: companyDisplayName,
      country,
      website: companyWebsite,
      jobDescriptionText: options.job.rawText,
      roleTitle: options.job.roleTitle,
      additionalInstructions: options.additionalInstructions,
    },
  });
  const reconciledContext: CompanyContext = {
    ...companyContext,
    companyName: companyDisplayName,
    displayName: companyContext.displayName?.trim()
      ? resolveCompanyDisplayNameForProse({
          rawName: companyContext.displayName,
          website: companyWebsite,
          savedDisplayName: companyContext.displayName,
        }).companyDisplayName
      : companyDisplayName,
    website: companyWebsite ?? companyContext.website,
  };

  const candidateName = options.resumeDraft.content.header.fullName?.trim() || undefined;
  const evidencePrompt = buildCoverLetterEvidencePrompt({
    inventory: options.inventory,
    resumeDraft: options.resumeDraft,
    job: options.job,
    companyContext: reconciledContext,
    companyDisplayName,
    evidenceControls: options.evidenceControls,
  });

  const response = await requestCoverLetterGeneration({
    jobDescription: {
      id: options.job.id,
      rawText: options.job.rawText,
      companyName: companyDisplayName,
      roleTitle: options.job.roleTitle,
      jobUrl: options.job.jobUrl,
    },
    resumeDraftId: options.resumeDraft.id,
    resumeEvidenceSpine: evidencePrompt.resumeEvidenceSpine,
    targetRoleTitle: options.resumeDraft.content.targetRoleTitle,
    candidateName,
    communicationProfile: profile?.content ?? "",
    companyName: companyDisplayName,
    companyDisplayName,
    companyNameRaw,
    country,
    companyWebsite,
    additionalInstructions: options.additionalInstructions,
    companyContext: reconciledContext,
    coverLetterModelTier,
  });

  const saveInput = {
    applicationId: options.applicationId,
    jobDescriptionId: options.job.id,
    resumeDraftId: options.resumeDraft.id,
    companyName: companyDisplayName,
    country,
    companyWebsite,
    additionalInstructions: options.additionalInstructions,
    companyContext: reconciledContext,
    body: response.formalContent,
    rationale: {
      ...response.rationale,
      storySpinePrompt: evidencePrompt.resumeEvidenceSpine,
      modelSelection: response.rationale.modelSelection ?? {
        requestedTier: coverLetterModelTier,
        fallbackApplied: response.modelFallbackApplied ?? false,
      },
    },
    provider: response.provider,
    modelName: response.modelName,
  };

  if (options.existingCoverLetterId?.trim()) {
    return replaceGeneratedCoverLetterDraftInCloud(options.existingCoverLetterId.trim(), saveInput);
  }

  return createGeneratedCoverLetterDraftInCloud(saveInput);
}
