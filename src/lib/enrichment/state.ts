import type {
  BulletEnrichmentSuggestion,
  DuplicateGroupSuggestion,
  EnrichmentApiResponse,
  EnrichmentRunMetadata,
  EnrichmentState,
  EnrichmentSuggestionDraft,
  KeywordBankItem,
  KeywordCategory,
  SuggestionStatus,
} from "@/types/enrichment";
import { normalizeStoredSuggestion } from "@/lib/enrichment/normalize";

function createId(): string {
  return crypto.randomUUID();
}

export function createEmptyEnrichmentState(): EnrichmentState {
  return {
    suggestions: [],
    duplicateGroups: [],
    keywordBank: [],
  };
}

function suggestionFingerprint(suggestion: {
  bulletKey: string;
  issueType: string;
}): string {
  return `${suggestion.bulletKey}::${suggestion.issueType}`;
}

function categorizeKeyword(keyword: string): KeywordCategory {
  const lower = keyword.toLowerCase();
  if (lower.includes("strateg")) return "Strategy";
  if (lower.includes("operat") || lower.includes("execution")) return "Operations";
  if (lower.includes("product")) return "Product";
  if (lower.includes("financ") || lower.includes("revenue")) return "Finance";
  if (lower.includes("partner")) return "Partnerships";
  if (lower.includes("technical") || lower.includes("engineer")) return "Technical";
  if (lower.includes("lead")) return "Leadership";
  return "Other";
}

export function upsertKeywordBankItem(
  bank: KeywordBankItem[],
  keyword: string,
  source: KeywordBankItem["source"],
  approved: boolean,
): KeywordBankItem[] {
  const normalized = keyword.trim();
  if (!normalized) return bank;

  const existing = bank.find(
    (item) => item.keyword.toLowerCase() === normalized.toLowerCase(),
  );

  if (!existing) {
    return [
      ...bank,
      {
        id: createId(),
        keyword: normalized,
        category: categorizeKeyword(normalized),
        source,
        approved,
        seenCount: 1,
      },
    ];
  }

  return bank.map((item) => {
    if (item.id !== existing.id) return item;
    return {
      ...item,
      approved: approved || item.approved,
      source: item.source === "user_added" ? item.source : source,
      seenCount: item.seenCount + 1,
    };
  });
}

function buildRunMetadata(result: EnrichmentApiResponse): EnrichmentRunMetadata {
  return {
    provider: result.provider,
    isMock: result.isMock,
    providerLabel: result.providerLabel,
    modelName: result.modelName,
    batchMode: result.batchMode,
    bulletsSent: result.bulletsSent,
    suggestionsReturned: result.suggestionsReturned,
    timestamp: result.timestamp,
  };
}

function draftFromSuggestion(
  suggestion: BulletEnrichmentSuggestion,
): EnrichmentSuggestionDraft {
  return {
    bulletKey: suggestion.bulletKey,
    bulletId: suggestion.bulletId,
    company: suggestion.company,
    role: suggestion.role,
    issueType: suggestion.issueType,
    issueTitle: suggestion.issueTitle,
    beforeText: suggestion.beforeText,
    suggestedAfterText: suggestion.suggestedAfterText,
    suggestedKeywords: suggestion.suggestedKeywords,
    suggestedCapabilities: suggestion.suggestedCapabilities,
    suggestedRoleTypes: suggestion.suggestedRoleTypes,
    changes: suggestion.changes,
    rationale: suggestion.rationale,
    riskWarnings: suggestion.riskWarnings,
    sourceCitations: suggestion.sourceCitations,
    duplicateGroupId: suggestion.duplicateGroupId,
    duplicateReason: suggestion.duplicateReason,
    bulletDescription: suggestion.bulletDescription,
    alternativeBulletWordings: suggestion.alternativeBulletWordings,
  };
}

function duplicateGroupDraftFromSuggestion(
  group: DuplicateGroupSuggestion,
): EnrichmentApiResponse["duplicateGroups"][number] {
  return {
    id: group.id,
    bulletKeys: group.bulletKeys,
    bulletDescriptions: group.bulletDescriptions,
    reason: group.reason,
  };
}

export function mergeEnrichmentResult(
  current: EnrichmentState,
  result: EnrichmentApiResponse,
): EnrichmentState {
  const now = new Date().toISOString();
  const preserved = current.suggestions.filter(
    (item) => item.status === "accepted" || item.status === "rejected",
  );
  const preservedFingerprints = new Set(
    preserved.map((item) => suggestionFingerprint(item)),
  );

  const incomingSuggestions: BulletEnrichmentSuggestion[] = result.suggestions
    .filter((suggestion) => !preservedFingerprints.has(suggestionFingerprint(suggestion)))
    .map((suggestion) => ({
      ...suggestion,
      id: createId(),
      status: "pending" as const,
      createdAt: now,
    }));

  const preservedGroups = current.duplicateGroups.filter(
    (group) => group.status !== "pending",
  );
  const preservedGroupIds = new Set(preservedGroups.map((group) => group.id));

  const incomingGroups: DuplicateGroupSuggestion[] = result.duplicateGroups
    .filter((group) => !preservedGroupIds.has(group.id))
    .map((group) => ({
      ...group,
      status: "pending" as const,
    }));

  return {
    ...current,
    suggestions: [...preserved, ...incomingSuggestions],
    duplicateGroups: [...preservedGroups, ...incomingGroups],
    lastEnrichedAt: now,
    providerId: result.provider,
    isMockProvider: result.isMock,
    providerLabel: result.providerLabel,
    lastRunMetadata: buildRunMetadata(result),
  };
}

export function applyTestBatchResult(
  current: EnrichmentState,
  result: EnrichmentApiResponse,
): EnrichmentState {
  const now = result.timestamp;
  const suggestions: BulletEnrichmentSuggestion[] = result.suggestions.map(
    (suggestion) => ({
      ...suggestion,
      id: createId(),
      status: "pending" as const,
      createdAt: now,
    }),
  );
  const duplicateGroups: DuplicateGroupSuggestion[] = result.duplicateGroups.map(
    (group) => ({
      ...group,
      status: "pending" as const,
    }),
  );

  return {
    ...current,
    testBatch: {
      suggestions,
      duplicateGroups,
      runMetadata: buildRunMetadata(result),
    },
    lastRunMetadata: buildRunMetadata(result),
  };
}

export function mergeTestBatchIntoMain(current: EnrichmentState): EnrichmentState {
  if (!current.testBatch) return current;

  const response: EnrichmentApiResponse = {
    suggestions: current.testBatch.suggestions.map(draftFromSuggestion),
    duplicateGroups: current.testBatch.duplicateGroups.map(
      duplicateGroupDraftFromSuggestion,
    ),
    providerId: current.testBatch.runMetadata.provider,
    provider: current.testBatch.runMetadata.provider,
    isMock: current.testBatch.runMetadata.isMock,
    providerLabel: current.testBatch.runMetadata.providerLabel,
    modelName: current.testBatch.runMetadata.modelName,
    batchMode: current.testBatch.runMetadata.batchMode,
    bulletsSent: current.testBatch.runMetadata.bulletsSent,
    suggestionsReturned: current.testBatch.runMetadata.suggestionsReturned,
    timestamp: current.testBatch.runMetadata.timestamp,
  };

  const merged = mergeEnrichmentResult(current, response);
  return {
    ...merged,
    testBatch: undefined,
  };
}

export function clearTestBatch(current: EnrichmentState): EnrichmentState {
  return {
    ...current,
    testBatch: undefined,
  };
}

export function updateTestBatchSuggestionStatus(
  state: EnrichmentState,
  suggestionId: string,
  status: SuggestionStatus,
): EnrichmentState {
  if (!state.testBatch) return state;

  const now = new Date().toISOString();
  return {
    ...state,
    testBatch: {
      ...state.testBatch,
      suggestions: state.testBatch.suggestions.map((suggestion) =>
        suggestion.id === suggestionId
          ? {
              ...suggestion,
              status,
              reviewedAt: now,
            }
          : suggestion,
      ),
    },
  };
}

export function updateSuggestionStatus(
  state: EnrichmentState,
  suggestionId: string,
  status: SuggestionStatus,
): EnrichmentState {
  const now = new Date().toISOString();
  let keywordBank = state.keywordBank;

  const suggestions = state.suggestions.map((suggestion) => {
    if (suggestion.id !== suggestionId) return suggestion;
    if (status === "accepted" && suggestion.issueType === "keyword_suggestion") {
      for (const keyword of suggestion.suggestedKeywords) {
        keywordBank = upsertKeywordBankItem(
          keywordBank,
          keyword,
          "ai_suggested",
          true,
        );
      }
    }
    return {
      ...suggestion,
      status,
      reviewedAt: now,
    };
  });

  return {
    ...state,
    suggestions,
    keywordBank,
  };
}

export function updateDuplicateGroupStatus(
  state: EnrichmentState,
  groupId: string,
  status: DuplicateGroupSuggestion["status"],
): EnrichmentState {
  const now = new Date().toISOString();
  return {
    ...state,
    duplicateGroups: state.duplicateGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            status,
            reviewedAt: now,
          }
        : group,
    ),
  };
}

export function countPendingSuggestions(state: EnrichmentState): number {
  return (
    state.suggestions.filter((item) => item.status === "pending").length +
    state.duplicateGroups.filter((group) => group.status === "pending").length
  );
}

export function countApprovedKeywords(state: EnrichmentState): number {
  return state.keywordBank.filter((item) => item.approved).length;
}

export function migrateEnrichmentSuggestions(
  value: unknown,
): BulletEnrichmentSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeStoredSuggestion(item))
    .filter((item): item is BulletEnrichmentSuggestion => item !== null);
}
