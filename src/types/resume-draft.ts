import type { SourceCitation } from "@/types/collated";
import type { AIProviderId } from "@/types/enrichment";
import type { CompanyContext } from "@/types/company-context";

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

export type ResumeDraftExportLayoutSettings = {
  bodyFontPx: number;
  marginMm: number;
  marginTopMm: number;
  lineSpacing: number;
  /** Optional — defaults to PREVIEW_ITEM_LINE_SPACING_DEFAULT when absent. */
  itemLineSpacing?: number;
  sectionSpacing: number;
};

export type ResumeDraftContent = {
  schemaVersion: typeof RESUME_DRAFT_SCHEMA_VERSION;
  targetRoleTitle?: string;
  header: ResumeDraftHeader;
  /** Legacy schema field — always empty for resumes; cover letter use only (future). */
  professionalSummary: ResumeDraftProfessionalSummary;
  skills: ResumeDraftSkillsSection;
  experience: ResumeDraftExperienceSection[];
  education: ResumeDraftEducationItem[];
  additionalExperience: ResumeDraftAdditionalExperienceItem[];
  globalRiskFlags: string[];
  /** Last approved preview/export layout settings (optional). */
  exportLayoutSettings?: ResumeDraftExportLayoutSettings;
  /** Server Puppeteer PDF validation captured on successful approve (optional). */
  serverPdfValidation?: ResumeDraftServerPdfValidation;
};

export type ResumeDraftServerPdfValidation = {
  pageCount: number;
  validatedAt: string;
};

export type ResumeDraftSelectionAudit = {
  jdThemes?: string[];
  selectedBulletKeys?: string[];
  acceptedWordingUsed?: string[];
  approvedKeywordsUsed?: string[];
  approvedKeywordsSkipped?: string[];
};

/** User-directed evidence selection for resume regeneration. */
export type ResumeDraftRegenerationControls = {
  forcedBulletKeys: string[];
  excludedBulletKeys: string[];
};

export type ResumeDraftRationale = {
  overall: string;
  toneNotes?: string;
  omissions: string[];
  keywordUsage: string[];
  selectionAudit?: ResumeDraftSelectionAudit;
  structureRepair?: {
    actions: string[];
    messages: string[];
    needsReview: boolean;
  };
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
  regenerationControls?: ResumeDraftRegenerationControls;
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
  /** Advisory market-language bank — not standalone evidence. */
  usage: "advisory_keyword_bank";
  overlapsJobDescription?: boolean;
};

export type ResumeDraftBulletInput = {
  bulletKey: string;
  collatedBulletId: string;
  company: string;
  role: string;
  dateRange?: string;
  keyword?: string;
  description: string;
  rawTexts: string[];
  acceptedWording?: string;
  sourceCitations: SourceCitation[];
};

export type ResumeDraftGenerationAuditHints = {
  bulletCap: number;
  totalInventoryBullets: number;
  bulletsIncluded: number;
  bulletsOmitted: number;
  bulletsWithAcceptedWording: number;
  jdTermSample: string[];
  unavailableForcedBulletKeys?: string[];
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
  auditHints?: ResumeDraftGenerationAuditHints;
  regenerationControls?: ResumeDraftRegenerationControls;
  companyContext?: CompanyContext;
};

export type ResumeDraftGenerationRequest = ResumeDraftGenerationInput & {
  inputSnapshot: ResumeDraftInputSnapshot;
};

export type ResumeDraftGenerationResult = {
  content: ResumeDraftContent;
  rationale: ResumeDraftRationale;
  draftStatus?: string;
};

export type ResumeDraftGenerationResponse = ResumeDraftGenerationResult & {
  inputSnapshot: ResumeDraftInputSnapshot;
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  timestamp: string;
  draftStatus?: string;
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
  applicationId?: string;
  content: ResumeDraftContent;
  rationale: ResumeDraftRationale;
  inputSnapshot: ResumeDraftInputSnapshot;
  provider: AIProviderId;
  modelName?: string;
  status?: string;
};
