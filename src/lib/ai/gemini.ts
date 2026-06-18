import { buildEnrichmentPrompt } from "@/lib/enrichment/prompt";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import { normalizeSuggestionDraft } from "@/lib/enrichment/normalize";
import type { EnrichmentResult } from "@/types/enrichment";
import type { AIProvider } from "@/lib/ai/types";

function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  return JSON.parse(candidate);
}

export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    id: "gemini",

    async enrichInventory(input: EnrichmentInventoryInput): Promise<EnrichmentResult> {
      const prompt = buildEnrichmentPrompt(input);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Gemini API error: ${message}`);
      }

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini API returned no content.");
      }

      const parsed = extractJson(text) as {
        suggestions?: Array<Record<string, unknown>>;
        duplicateGroups?: EnrichmentResult["duplicateGroups"];
      };

      const bulletByKey = new Map(input.bullets.map((bullet) => [bullet.bulletKey, bullet]));

      return {
        providerId: "gemini",
        suggestions: (parsed.suggestions ?? []).map((suggestion) => {
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
        duplicateGroups: (parsed.duplicateGroups ?? []).map((group) => ({
          id: group.id,
          bulletKeys: group.bulletKeys ?? [],
          bulletDescriptions: (group.bulletKeys ?? [])
            .flatMap((key) => {
              const bullet = bulletByKey.get(key);
              if (!bullet) return [];
              if (bullet.rawTexts.length > 1) return bullet.rawTexts;
              return [bullet.description];
            }),
          reason: group.reason ?? "Possible duplicate bullets detected.",
        })),
      };
    },
  };
}
