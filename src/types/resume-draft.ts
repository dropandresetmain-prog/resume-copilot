import type { SourceCitation } from "@/types/collated";
import type { AIProviderId } from "@/types/enrichment";
import type { CompanyContext } from "@/types/company-context";
import type { ModelTier } from "@/lib/ai/model-tiers";
import type { EvidenceSpineSnapshot } from "@/lib/evidence/types";

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
  /** Inventory-backed strengths that best match this JD. */
  strongestMatches?: string[];
  /** Honest gaps — JD asks not supported by inventory (may mirror omissions). */
  honestGaps?: string[];
  /** One-sentence positioning recommendation for this application. */
  positioningAngle?: string;
  /** Why these Work Experience roles were chosen over others. */
  roleSelectionRationale?: string;
  selectedBulletKeys?: string[];
  acceptedWordingUsed?: string[];
  approvedKeywordsUsed?: string[];
  approvedKeywordsSkipped?: string[];
};

/** User-directed evidence selection for resume regeneration. */
export type ResumeDraftRegenerationControls = {
  forcedBulletKeys: string[];
  excludedBulletKeys: string[];
  /** v0.9.18A — Additional Experience spine IDs only (`additional:{item.id}`). */
  forcedEvidenceIds?: string[];
  /** v0.9.18A — Additional Experience spine IDs only (`additional:{item.id}`). */
  excludedEvidenceIds?: string[];
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
  forcedBulletAudit?: {
    requestedKeys: string[];
    unavailableKeys: Array<{
      key: string;
      reason: "excluded" | "hidden" | "not_in_active_inventory" | "unknown";
      message: string;
    }>;
    alreadyInPayloadKeys: string[];
    includedInOutput: string[];
    missingFromOutput: string[];
    removedDuringRepair: string[];
    unableToPreserveDuringRepair: string[];
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
  evidenceSpine?: EvidenceSpineSnapshot;
  generatedAtRequest: string;
  resumeModelTier?: ModelTier;
  coverLetterModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
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
  evidenceSpineVersion?: 1;
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
  evidenceSpine?: EvidenceSpineSnapshot;
};

export type ResumeDraftGenerationRequest = ResumeDraftGenerationInput & {
  inputSnapshot: ResumeDraftInputSnapshot;
  resumeModelTier?: ModelTier;
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
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
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

export type ResumeRoleRewriteRequestItem = {
  roleIndex: number;
  currentRole: ResumeDraftExperienceSection;
  forcedBulletKeys: string[];
  allowedSourceBulletKeys: string[];
  inventoryBullets: Array<{
    bulletKey: string;
    collatedBulletId?: string;
    description: string;
    keyword?: string;
    acceptedWording?: string;
    company: string;
    role: string;
  }>;
};

export type ResumeRoleRewriteRequest = {
  jobDescription: {
    id: string;
    rawText: string;
    companyName?: string;
    roleTitle?: string;
  };
  referenceResume?: Pick<ResumeDraftReferenceResumeExcerpt, "bulletStyle">;
  roles: ResumeRoleRewriteRequestItem[];
  resumeModelTier?: ModelTier;
};

export type ResumeRoleRewriteResponse = {
  roles: Array<{
    roleIndex: number;
    bullets: ResumeDraftExperienceBullet[];
    notes?: string;
  }>;
  validationIssues?: string[];
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
  timestamp: string;
};

export type ResumeCustomRevisionScope = "professional_summary" | "selected_role";

export type ResumeCustomRevisionRequest = {
  draftId: string;
  scope: ResumeCustomRevisionScope;
  roleIndex?: number;
  customInstruction: string;
  content: ResumeDraftContent;
  jobDescription: {
    id?: string;
    rawText: string;
    companyName?: string;
    roleTitle?: string;
  };
  referenceResume?: Pick<ResumeDraftReferenceResumeExcerpt, "bulletStyle">;
  resumeModelTier?: ModelTier;
  /** When false (default), returns a staged candidate without saving. */
  persist?: boolean;
};

export type ResumeCustomRevisionResponse = {
  scope: ResumeCustomRevisionScope;
  roleIndex?: number;
  professionalSummaryText?: string;
  roleBullets?: ResumeDraftExperienceBullet[];
  warnings: string[];
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
  persisted: boolean;
  timestamp: string;
};

export type ResumeRevisionQueueItem =
  | {
      id: string;
      scope: "professional_summary";
      customInstruction: string;
    }
  | {
      id: string;
      scope: "selected_role";
      roleIndex: number;
      customInstruction: string;
    };

export type ResumeBatchRevisionRequest = {
  draftId: string;
  content: ResumeDraftContent;
  jobDescription: {
    id?: string;
    rawText: string;
    companyName?: string;
    roleTitle?: string;
  };
  queue: ResumeRevisionQueueItem[];
  referenceResume?: Pick<ResumeDraftReferenceResumeExcerpt, "bulletStyle">;
  resumeModelTier?: ModelTier;
  /** When false (default), returns staged candidates without saving. */
  persist?: boolean;
};

export type ResumeBatchRevisionRoleCandidate = {
  roleIndex: number;
  company: string;
  role: string;
  bullets: ResumeDraftExperienceBullet[];
};

export type ResumeBatchRevisionResponse = {
  summaryCandidate?: { text: string };
  roleCandidates: ResumeBatchRevisionRoleCandidate[];
  warnings: string[];
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
  persisted: boolean;
  timestamp: string;
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
