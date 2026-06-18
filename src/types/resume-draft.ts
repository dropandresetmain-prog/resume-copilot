import type { SourceCitation } from "@/types/collated";
import type { AIProviderId } from "@/types/enrichment";

export const RESUME_DRAFT_SCHEMA_VERSION = 1 as const;

export type ResumeDraftConfidence = "high" | "medium" | "low";

export type ResumeDraftBulletSourceRef = {
  collatedBulletId?: string;
  bulletKey?: string;
  resumeId?: string;
  filename?: string;
};

export type ResumeDraftExperienceBullet = {
  text: string;
  sourceRefs: ResumeDraftBulletSourceRef[];
  jdAlignmentReason?: string;
  confidence: ResumeDraftConfidence;
  riskFlags: string[];
};

export type ResumeDraftExperienceSection = {
  company: string;
  companyDescriptor?: string;
  role: string;
  location?: string;
  dateRange?: string;
  bullets: ResumeDraftExperienceBullet[];
  riskFlags: string[];
};

export type ResumeDraftEducationItem = {
  institution: string;
  location?: string;
  programmes: string[];
  dateRange?: string;
  bullets: string[];
  riskFlags: string[];
};

export type ResumeDraftAdditionalExperienceItem = {
  category?: string;
  text: string;
  riskFlags: string[];
};

export type ResumeDraftSkillGroup = {
  label: string;
  items: string[];
};

export type ResumeDraftHeader = {
  fullName?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  includeHeader: boolean;
  notes?: string;
};

export type ResumeDraftProfessionalSummary = {
  text: string;
  jdAlignment: string[];
  riskFlags: string[];
};

export type ResumeDraftSkillsSection = {
  groups: ResumeDraftSkillGroup[];
  jdAlignment: string[];
  riskFlags: string[];
};

export type ResumeDraftContent = {
  schemaVersion: typeof RESUME_DRAFT_SCHEMA_VERSION;
  targetRoleTitle?: string;
  header: ResumeDraftHeader;
  professionalSummary: ResumeDraftProfessionalSummary;
  skills: ResumeDraftSkillsSection;
  experience: ResumeDraftExperienceSection[];
  education: ResumeDraftEducationItem[];
  additionalExperience: ResumeDraftAdditionalExperienceItem[];
  globalRiskFlags: string[];
};

export type ResumeDraftRationale = {
  overall: string;
  toneNotes?: string;
  omissions: string[];
  keywordUsage: string[];
};

export type ResumeDraftInputSnapshot = {
  schemaVersion: typeof RESUME_DRAFT_SCHEMA_VERSION;
  jobDescriptionId: string;
  referenceResumeId: string;
  referenceResumeFilename: string;
  approvedKeywordIds: string[];
  approvedKeywords: string[];
  collatedSummary: {
    experienceCount: number;
    bulletCount: number;
    educationCount: number;
    skillCount: number;
  };
  generatedAtRequest: string;
};

export type GeneratedResumeDraftRecord = {
  id: string;
  userId: string;
  applicationId?: string;
  jobDescriptionId?: string;
  referenceResumeId?: string;
  content: ResumeDraftContent;
  rationale?: ResumeDraftRationale;
  inputSnapshot?: ResumeDraftInputSnapshot;
  provider?: AIProviderId;
  modelName?: string;
  status: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type ResumeDraftKeywordInput = {
  id: string;
  keyword: string;
  category: string;
};

export type ResumeDraftBulletInput = {
  bulletKey: string;
  collatedBulletId: string;
  company: string;
  role: string;
  keyword?: string;
  description: string;
  rawTexts: string[];
  sourceCitations: SourceCitation[];
};

export type ResumeDraftExperienceInput = {
  collatedExperienceId: string;
  company: string;
  companyDescriptor?: string;
  role: string;
  location?: string;
  dateRange?: string;
  sourceCitations: SourceCitation[];
  bullets: ResumeDraftBulletInput[];
};

export type ResumeDraftReferenceResumeExcerpt = {
  resumeId: string;
  filename: string;
  /** Formatting/template reference only — never use as content source. */
  formattingOnly: true;
  bulletStyle: "keyword_colon" | "plain";
  sectionOrder: string[];
  headerContact?: {
    fullName?: string;
    phone?: string;
    email?: string;
  };
  densityHint: "compact" | "standard";
  fontFamily?: string;
  bodyFontSizePx?: number;
  headerAlignment?: "center" | "left";
};

export type ResumeDraftGenerationInput = {
  jobDescription: {
    id: string;
    rawText: string;
    companyName?: string;
    roleTitle?: string;
    jobUrl?: string;
  };
  approvedKeywords: ResumeDraftKeywordInput[];
  experiences: ResumeDraftExperienceInput[];
  education: {
    institution: string;
    location?: string;
    programmes: string[];
    dateRange?: string;
    bullets: string[];
    sourceCitations: SourceCitation[];
  }[];
  additionalExperience: {
    category?: string;
    text: string;
    sourceCitations: SourceCitation[];
  }[];
  skills: {
    category: string;
    text: string;
    sourceCitations: SourceCitation[];
  }[];
  referenceResume: ResumeDraftReferenceResumeExcerpt;
};

export type ResumeDraftGenerationRequest = ResumeDraftGenerationInput & {
  inputSnapshot: ResumeDraftInputSnapshot;
};

export type ResumeDraftGenerationResult = {
  content: ResumeDraftContent;
  rationale: ResumeDraftRationale;
};

export type ResumeDraftGenerationResponse = ResumeDraftGenerationResult & {
  inputSnapshot: ResumeDraftInputSnapshot;
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  timestamp: string;
};

export type ResumeDraftProviderStatusResponse = {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  configured: boolean;
  configurationError?: string;
  supportsResumeDraft: boolean;
};

export type ResumeDraftApiErrorResponse = {
  error: string;
  rawModelResponse?: string;
  provider?: AIProviderId;
  isMock?: boolean;
  providerLabel?: string;
  modelName?: string;
  timestamp?: string;
};

export type CreateGeneratedResumeDraftInput = {
  jobDescriptionId: string;
  referenceResumeId: string;
  content: ResumeDraftContent;
  rationale: ResumeDraftRationale;
  inputSnapshot: ResumeDraftInputSnapshot;
  provider: AIProviderId;
  modelName?: string;
  status?: string;
};
