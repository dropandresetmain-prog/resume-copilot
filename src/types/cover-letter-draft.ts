import type { CompanyContext } from "@/types/company-context";
import type { AIProviderId } from "@/types/enrichment";

export const COVER_LETTER_SCHEMA_VERSION = 1 as const;

export type CoverLetterRationale = {
  selectedThemes: string[];
  whyTheseThemes: string;
  companyContextUsed: string[];
  riskFlags: string[];
  wordCount: number;
  emailCoverLetter: string;
  linkedinMessage: string;
  recruiterDm: string;
  whatsappIntro: string;
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
  communicationProfile: string;
  companyName: string;
  country: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  companyContext: CompanyContext;
};

export type CoverLetterGenerationResponse = CoverLetterGenerationResult & {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
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
