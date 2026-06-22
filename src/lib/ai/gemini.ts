import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
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
      const { text } = await callGeminiWithRetry({
        apiKey,
        prompt,
        temperature: 0.2,
        responseMimeType: "application/json",
      });

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
