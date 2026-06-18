import type { SourceCitation } from "@/types/collated";

export type KeywordCategory =
  | "Strategy"
  | "Operations"
  | "Product"
  | "Finance"
  | "Partnerships"
  | "Technical"
  | "Leadership"
  | "Other";

export type KeywordSource = "resume" | "ai_suggested" | "user_added";

export type KeywordBankItem = {
  id: string;
  keyword: string;
  category: KeywordCategory;
  source: KeywordSource;
  approved: boolean;
  seenCount: number;
};

export type SuggestionStatus = "pending" | "accepted" | "rejected" | "ignored";

export type DuplicateGroupStatus =
  | "pending"
  | "keep_all"
  | "group_variants"
  | "rejected";

export type EnrichmentIssueType =
  | "keyword_suggestion"
  | "capability_suggestion"
  | "alternative_wording"
  | "possible_duplicate"
  | "risk_warning"
  | "other";

export type AIProviderId = "mock" | "gemini" | "openai";

export type BulletEnrichmentSuggestion = {
  id: string;
  bulletKey: string;
  bulletId?: string;
  company: string;
  role: string;
  issueType: EnrichmentIssueType;
  issueTitle: string;
  beforeText: string;
  suggestedAfterText?: string;
  suggestedKeywords: string[];
  suggestedCapabilities: string[];
  suggestedRoleTypes: string[];
  changes: string[];
  rationale: string;
  riskWarnings: string[];
  sourceCitations?: SourceCitation[];
  duplicateGroupId?: string;
  duplicateReason?: string;
  status: SuggestionStatus;
  createdAt: string;
  reviewedAt?: string;
  /** @deprecated Use beforeText */
  bulletDescription?: string;
  /** @deprecated Use suggestedAfterText */
  alternativeBulletWordings?: string[];
};

export type DuplicateGroupSuggestion = {
  id: string;
  bulletKeys: string[];
  bulletDescriptions: string[];
  reason: string;
  status: DuplicateGroupStatus;
  reviewedAt?: string;
};

export type EnrichmentState = {
  suggestions: BulletEnrichmentSuggestion[];
  duplicateGroups: DuplicateGroupSuggestion[];
  keywordBank: KeywordBankItem[];
  lastEnrichedAt?: string;
  providerId?: AIProviderId;
  isMockProvider?: boolean;
  providerLabel?: string;
};

export type EnrichmentSuggestionDraft = Omit<
  BulletEnrichmentSuggestion,
  "id" | "status" | "createdAt" | "reviewedAt"
>;

export type EnrichmentResult = {
  suggestions: EnrichmentSuggestionDraft[];
  duplicateGroups: Omit<DuplicateGroupSuggestion, "status" | "reviewedAt">[];
  providerId: AIProviderId;
};

export type EnrichmentApiResponse = EnrichmentResult & {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
};
