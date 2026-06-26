import type { CompanyContext } from "@/types/company-context";
import type { AIProviderId } from "@/types/enrichment";
import type { ModelTier } from "@/lib/ai/model-tiers";

export const COVER_LETTER_SCHEMA_VERSION = 1 as const;

export type CoverLetterRationale = {
  selectedThemes: string[];
  whyTheseThemes: string;
  companyContextUsed: string[];
  selectedCompanyFacts?: string[];
  selectedRoleRequirements?: string[];
  companyRoleStoryBridges?: string[];
  riskFlags: string[];
  wordCount: number;
  emailCoverLetter: string;
  linkedinMessage: string;
  recruiterDm: string;
  whatsappIntro: string;
  modelSelection?: {
    requestedTier: ModelTier;
    fallbackApplied?: boolean;
  };
  /** Compact inventory story spine prompt saved at generation for revision consistency. */
  storySpinePrompt?: string;
};

export type CoverLetterGenerationResult = {
  formalContent: string;
  rationale: CoverLetterRationale;
};

export type CoverLetterGenerationInput = {
  jobDescription: {
    id: string;
    rawText: string;
    companyName?: string;
    roleTitle?: string;
    jobUrl?: string;
  };
  resumeDraftId: string;
  resumeEvidenceSpine: string;
  targetRoleTitle?: string;
  /** Candidate's full name from parsed/generated resume data. Used for salutation and closing. */
  candidateName?: string;
  communicationProfile: string;
  companyName: string;
  companyDisplayName?: string;
  companyNameRaw?: string;
  country: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  companyContext: CompanyContext;
  coverLetterModelTier?: ModelTier;
};

export type CoverLetterGenerationResponse = CoverLetterGenerationResult & {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
  timestamp: string;
};

export type CoverLetterProviderStatusResponse = {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  configured: boolean;
  configurationError?: string;
  supportsCoverLetter: boolean;
};

export type GeneratedCoverLetterDraftRecord = {
  id: string;
  userId: string;
  applicationId?: string;
  jobDescriptionId?: string;
  resumeDraftId?: string;
  companyName?: string;
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  companyContext?: CompanyContext;
  body: string;
  rationale?: CoverLetterRationale;
  provider?: AIProviderId;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGeneratedCoverLetterDraftInput = {
  applicationId?: string;
  jobDescriptionId: string;
  resumeDraftId: string;
  companyName?: string;
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  companyContext?: CompanyContext;
  body: string;
  rationale: CoverLetterRationale;
  provider: AIProviderId;
  modelName?: string;
};

export type CoverLetterApiErrorResponse = {
  error: string;
  rawModelResponse?: string;
  provider?: AIProviderId;
  isMock?: boolean;
  providerLabel?: string;
  modelName?: string;
  timestamp?: string;
};

export const COVER_LETTER_REVISION_ACTIONS = [
  "shorten",
  "warmer",
  "more_conversational",
  "more_direct",
  "more_formal",
  "remove_ai_phrases",
  "emphasize_company_fit",
  "emphasize_role_fit",
  "emphasize_technical_ai",
  "emphasize_founder_business",
  "custom",
] as const;

export type CoverLetterRevisionAction = (typeof COVER_LETTER_REVISION_ACTIONS)[number];

/** Pending-only evidence choices for the next cover-letter regeneration (not persisted). */
export type CoverLetterEvidenceControls = {
  forcedEvidenceIds: string[];
  excludedEvidenceIds: string[];
};

export type CoverLetterRevisionRequest = {
  draftId: string;
  currentBody: string;
  action: CoverLetterRevisionAction;
  customInstruction?: string;
  coverLetterModelTier?: ModelTier;
  /**
   * When false, returns a candidate revision without saving to Supabase.
   * Defaults to true (immediate persist) for backward compatibility.
   */
  persist?: boolean;
};

export type CoverLetterRevisionResponse = {
  body: string;
  wordCount: number;
  warnings: string[];
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
  /** Whether the revised body was written to the cover letter draft record. */
  persisted: boolean;
  timestamp: string;
};
