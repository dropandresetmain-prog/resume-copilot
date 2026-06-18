import { normalizeSuggestionDraft } from "@/lib/enrichment/normalize";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import type { EnrichmentResult } from "@/types/enrichment";

export function mapEnrichmentPayload(
  parsed: {
    suggestions: unknown[];
    duplicateGroups: unknown[];
  },
  input: EnrichmentInventoryInput,
): EnrichmentResult {
  const bulletByKey = new Map(input.bullets.map((bullet) => [bullet.bulletKey, bullet]));

  return {
    providerId: "gemini",
    suggestions: parsed.suggestions.map((entry) => {
      const suggestion = entry as Record<string, unknown>;
      const source = bulletByKey.get(String(suggestion.bulletKey ?? ""));
      return normalizeSuggestionDraft({
        bulletKey: String(suggestion.bulletKey ?? source?.bulletKey ?? ""),
        bulletId: source?.bulletId,
        company: source?.company ?? "",
        role: source?.role ?? "",
        issueType: suggestion.issueType as EnrichmentResult["suggestions"][number]["issueType"],
        issueTitle: typeof suggestion.issueTitle === "string" ? suggestion.issueTitle : undefined,
        beforeText:
          typeof suggestion.beforeText === "string"
            ? suggestion.beforeText
            : source?.description,
        suggestedAfterText:
          typeof suggestion.suggestedAfterText === "string"
            ? suggestion.suggestedAfterText
            : undefined,
        suggestedKeywords: Array.isArray(suggestion.suggestedKeywords)
          ? suggestion.suggestedKeywords.filter((item): item is string => typeof item === "string")
          : [],
        suggestedCapabilities: Array.isArray(suggestion.suggestedCapabilities)
          ? suggestion.suggestedCapabilities.filter((item): item is string => typeof item === "string")
          : [],
        suggestedRoleTypes: Array.isArray(suggestion.suggestedRoleTypes)
          ? suggestion.suggestedRoleTypes.filter((item): item is string => typeof item === "string")
          : [],
        changes: Array.isArray(suggestion.changes)
          ? suggestion.changes.filter((item): item is string => typeof item === "string")
          : undefined,
        rationale:
          typeof suggestion.rationale === "string" ? suggestion.rationale : undefined,
        riskWarnings: Array.isArray(suggestion.riskWarnings)
          ? suggestion.riskWarnings.filter((item): item is string => typeof item === "string")
          : [],
        sourceCitations: source?.sourceCitations,
        duplicateGroupId:
          typeof suggestion.duplicateGroupId === "string"
            ? suggestion.duplicateGroupId
            : undefined,
        duplicateReason:
          typeof suggestion.duplicateReason === "string"
            ? suggestion.duplicateReason
            : undefined,
      });
    }),
    duplicateGroups: parsed.duplicateGroups.map((entry) => {
      const group = entry as {
        id?: string;
        bulletKeys?: string[];
        reason?: string;
      };
      return {
        id: group.id ?? crypto.randomUUID(),
        bulletKeys: group.bulletKeys ?? [],
        bulletDescriptions: (group.bulletKeys ?? []).flatMap((key) => {
          const bullet = bulletByKey.get(key);
          if (!bullet) return [];
          if (bullet.rawTexts.length > 1) return bullet.rawTexts;
          return [bullet.description];
        }),
        reason: group.reason ?? "Possible duplicate bullets detected.",
      };
    }),
  };
}
