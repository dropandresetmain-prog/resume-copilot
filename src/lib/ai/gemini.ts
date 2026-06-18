import { GEMINI_MODEL } from "@/lib/ai/config";
import { mapEnrichmentPayload } from "@/lib/ai/map-enrichment-result";
import {
  EnrichmentParseError,
  parseEnrichmentJson,
} from "@/lib/ai/parse-enrichment-response";
import { buildEnrichmentPrompt } from "@/lib/enrichment/prompt";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import type { EnrichmentResult } from "@/types/enrichment";
import type { AIProvider } from "@/lib/ai/types";

export { GEMINI_MODEL };

export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    id: "gemini",

    async enrichInventory(input: EnrichmentInventoryInput): Promise<EnrichmentResult> {
      const prompt = buildEnrichmentPrompt(input);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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

      const parsed = parseEnrichmentJson(text);
      if (!parsed.ok) {
        throw new EnrichmentParseError(parsed.error, parsed.rawText);
      }

      const mapped = mapEnrichmentPayload(parsed.value, input);
      return {
        ...mapped,
        providerId: "gemini",
      };
    },
  };
}
