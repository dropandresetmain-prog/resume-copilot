import type { AIProviderId } from "@/types/enrichment";

export type InventoryTextSuggestionCategory =
  | "work_experience"
  | "bullets"
  | "skills"
  | "education"
  | "additional_experience"
  | "keywords";

export type InventoryTextSuggestionKind =
  | "new_work_experience"
  | "bullet_existing_experience"
  | "bullet_new_experience"
  | "skill"
  | "education"
  | "additional_experience"
  | "keyword";

export type InventoryTextMatchLabel =
  | "add_to_existing"
  | "new_experience"
  | "standalone";

/** Whether the user can apply this suggestion through inventory overlay mechanisms. */
export type InventoryTextApplyability = "applyable" | "preview_only";

export type InventoryTextExtractionSuggestion = {
  id: string;
  kind: InventoryTextSuggestionKind;
  category: InventoryTextSuggestionCategory;
  text: string;
  company?: string;
  role?: string;
  keyword?: string;
  institution?: string;
  dateRange?: string;
  matchLabel: InventoryTextMatchLabel;
  mappedExperienceKey?: string;
  warnings: string[];
  /** Set during review when text matches an existing inventory bullet. */
  duplicateOfBulletKey?: string;
  duplicateReason?: string;
  applyability: InventoryTextApplyability;
  sourceNote?: string;
};

export type InventoryTextExtractionResult = {
  sufficient: boolean;
  insufficientReason?: string;
  warnings: string[];
  suggestions: InventoryTextExtractionSuggestion[];
  providerId: AIProviderId;
};

export type InventoryTextExtractionRequest = {
  pastedText: string;
  /** Company/role index for matching only — not used to invent content. */
  existingExperiences: Array<{
    company: string;
    role: string;
    experienceKey: string;
  }>;
};

export type InventoryTextExtractionApiResponse = InventoryTextExtractionResult & {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  timestamp: string;
};

export type InventoryTextExtractionApiErrorResponse = {
  error: string;
  rawModelResponse?: string;
  provider?: AIProviderId;
  isMock?: boolean;
  providerLabel?: string;
  modelName?: string;
  timestamp?: string;
};

export type InventoryTextSuggestionReviewStatus = "pending" | "accepted" | "rejected";

export type ReviewedInventoryTextSuggestion = InventoryTextExtractionSuggestion & {
  reviewStatus: InventoryTextSuggestionReviewStatus;
  /** User-edited text before apply (optional). */
  editedText?: string;
};
