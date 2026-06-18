import type {
  BulletEnrichmentSuggestion,
  EnrichmentIssueType,
  EnrichmentSuggestionDraft,
} from "@/types/enrichment";

function defaultIssueTitle(issueType: EnrichmentIssueType): string {
  switch (issueType) {
    case "keyword_suggestion":
      return "Keyword could be more industry-standard";
    case "capability_suggestion":
      return "Capability tags could improve matching";
    case "alternative_wording":
      return "Bullet wording can be sharper";
    case "possible_duplicate":
      return "Possible duplicate / variant";
    case "risk_warning":
      return "Review before accepting";
    default:
      return "Enrichment suggestion";
  }
}

export function normalizeSuggestionDraft(
  draft: Partial<EnrichmentSuggestionDraft> & {
    bulletKey: string;
    company: string;
    role: string;
  },
): EnrichmentSuggestionDraft {
  const beforeText =
    draft.beforeText?.trim() ||
    draft.bulletDescription?.trim() ||
    "";
  const alternativeWordings = draft.alternativeBulletWordings ?? [];
  const suggestedAfterText =
    draft.suggestedAfterText?.trim() ||
    alternativeWordings[0]?.trim() ||
    undefined;
  const issueType = draft.issueType ?? "keyword_suggestion";

  return {
    bulletKey: draft.bulletKey,
    bulletId: draft.bulletId,
    company: draft.company,
    role: draft.role,
    issueType,
    issueTitle: draft.issueTitle?.trim() || defaultIssueTitle(issueType),
    beforeText,
    suggestedAfterText,
    suggestedKeywords: draft.suggestedKeywords ?? [],
    suggestedCapabilities: draft.suggestedCapabilities ?? [],
    suggestedRoleTypes: draft.suggestedRoleTypes ?? [],
    changes:
      draft.changes && draft.changes.length > 0
        ? draft.changes
        : buildDefaultChanges(issueType, draft.suggestedKeywords ?? []),
    rationale:
      draft.rationale?.trim() ||
      "This suggestion is intended to improve keyword matching without changing the underlying achievement.",
    riskWarnings: draft.riskWarnings ?? [],
    sourceCitations: draft.sourceCitations,
    duplicateGroupId: draft.duplicateGroupId,
    duplicateReason: draft.duplicateReason,
    bulletDescription: beforeText,
    alternativeBulletWordings: alternativeWordings.length
      ? alternativeWordings
      : suggestedAfterText
        ? [suggestedAfterText]
        : [],
  };
}

function buildDefaultChanges(
  issueType: EnrichmentIssueType,
  keywords: string[],
): string[] {
  switch (issueType) {
    case "keyword_suggestion":
      return keywords.length > 0
        ? ["Added industry-standard keyword alternatives", "Preserved original bullet wording"]
        : ["Reviewed bullet for keyword coverage"];
    case "alternative_wording":
      return ["Proposed sharper wording derived from the original bullet"];
    case "possible_duplicate":
      return ["Flagged similar achievement wording across uploaded resumes"];
    case "risk_warning":
      return ["Highlighted a potential overstatement or ambiguity risk"];
    default:
      return ["Suggested a reviewable enrichment improvement"];
  }
}

export function normalizeStoredSuggestion(
  value: unknown,
): BulletEnrichmentSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<BulletEnrichmentSuggestion>;
  if (typeof raw.id !== "string") return null;
  if (typeof raw.bulletKey !== "string") return null;
  if (typeof raw.status !== "string") return null;
  if (typeof raw.createdAt !== "string") return null;

  const draft = normalizeSuggestionDraft({
    bulletKey: raw.bulletKey,
    bulletId: raw.bulletId,
    company: typeof raw.company === "string" ? raw.company : "",
    role: typeof raw.role === "string" ? raw.role : "",
    issueType: raw.issueType,
    issueTitle: raw.issueTitle,
    beforeText: raw.beforeText ?? raw.bulletDescription,
    suggestedAfterText: raw.suggestedAfterText,
    suggestedKeywords: Array.isArray(raw.suggestedKeywords)
      ? raw.suggestedKeywords.filter((item): item is string => typeof item === "string")
      : [],
    suggestedCapabilities: Array.isArray(raw.suggestedCapabilities)
      ? raw.suggestedCapabilities.filter((item): item is string => typeof item === "string")
      : [],
    suggestedRoleTypes: Array.isArray(raw.suggestedRoleTypes)
      ? raw.suggestedRoleTypes.filter((item): item is string => typeof item === "string")
      : [],
    changes: Array.isArray(raw.changes)
      ? raw.changes.filter((item): item is string => typeof item === "string")
      : undefined,
    rationale: raw.rationale,
    riskWarnings: Array.isArray(raw.riskWarnings)
      ? raw.riskWarnings.filter((item): item is string => typeof item === "string")
      : [],
    sourceCitations: Array.isArray(raw.sourceCitations)
      ? raw.sourceCitations.filter(
          (item): item is NonNullable<BulletEnrichmentSuggestion["sourceCitations"]>[number] =>
            typeof item === "object" &&
            item !== null &&
            typeof item.resumeId === "string" &&
            typeof item.filename === "string",
        )
      : undefined,
    duplicateGroupId: raw.duplicateGroupId,
    duplicateReason: raw.duplicateReason,
    bulletDescription: raw.bulletDescription,
    alternativeBulletWordings: Array.isArray(raw.alternativeBulletWordings)
      ? raw.alternativeBulletWordings.filter((item): item is string => typeof item === "string")
      : undefined,
  });

  return {
    ...draft,
    id: raw.id,
    status: raw.status,
    resolution: raw.resolution,
    acceptedWording:
      typeof raw.acceptedWording === "string" ? raw.acceptedWording : undefined,
    createdAt: raw.createdAt,
    reviewedAt: typeof raw.reviewedAt === "string" ? raw.reviewedAt : undefined,
  };
}
