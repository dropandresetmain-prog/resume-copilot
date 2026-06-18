import { createGeminiProvider } from "@/lib/ai/gemini";
import { mockProvider } from "@/lib/ai/mock";
import { openaiProvider } from "@/lib/ai/openai";
import type { AIProvider, AIProviderId } from "@/lib/ai/types";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import type { EnrichmentApiResponse, EnrichmentResult } from "@/types/enrichment";

export function resolveProviderId(value?: string | null): AIProviderId {
  if (value === "gemini" || value === "openai" || value === "mock") {
    return value;
  }
  return "mock";
}

export function getProviderLabel(providerId: AIProviderId): string {
  switch (providerId) {
    case "gemini":
      return "Gemini enrichment";
    case "openai":
      return "OpenAI enrichment";
    case "mock":
    default:
      return "Mock enrichment";
  }
}

export function createAIProvider(providerId?: string | null): AIProvider {
  const resolved = resolveProviderId(providerId);

  switch (resolved) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
      }
      return createGeminiProvider(apiKey);
    }
    case "openai":
      return openaiProvider;
    case "mock":
    default:
      return mockProvider;
  }
}

export async function enrichInventoryWithAI(
  input: EnrichmentInventoryInput,
  providerId?: string | null,
): Promise<EnrichmentResult> {
  const provider = createAIProvider(providerId);
  return provider.enrichInventory(input);
}

export function toEnrichmentApiResponse(
  result: EnrichmentResult,
): EnrichmentApiResponse {
  const provider = resolveProviderId(result.providerId);
  return {
    ...result,
    provider,
    isMock: provider === "mock",
    providerLabel: getProviderLabel(provider),
  };
}

export { mockProvider } from "@/lib/ai/mock";
