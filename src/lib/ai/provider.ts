import { GEMINI_MODEL } from "@/lib/ai/config";
import {
  buildFeatureProviderStatus,
  requireGeminiApiKey,
  resolveActiveProviderId,
} from "@/lib/ai/feature-provider-helpers";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { mockProvider } from "@/lib/ai/mock";
import { openaiProvider } from "@/lib/ai/openai";
import type { AIProvider, AIProviderId } from "@/lib/ai/types";
import type { EnrichmentBatchMode } from "@/lib/enrichment/batch";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import type {
  EnrichmentApiResponse,
  EnrichmentResult,
  ProviderStatusResponse,
} from "@/types/enrichment";

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
  const resolved = resolveActiveProviderId(providerId);

  switch (resolved) {
    case "gemini":
      return createGeminiProvider(requireGeminiApiKey());
    case "openai":
      return openaiProvider;
    case "mock":
    default:
      return mockProvider;
  }
}

export function getProviderStatus(): ProviderStatusResponse {
  return buildFeatureProviderStatus({
    geminiModelName: GEMINI_MODEL,
    openAiFeatureName: "enrichment",
  });
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
  context: {
    batchMode: EnrichmentBatchMode;
    bulletsSent: number;
    modelName?: string;
    timestamp?: string;
  },
): EnrichmentApiResponse {
  const provider = resolveProviderId(result.providerId);
  const timestamp = context.timestamp ?? new Date().toISOString();
  return {
    ...result,
    provider,
    isMock: provider === "mock",
    providerLabel: getProviderLabel(provider),
    modelName: context.modelName ?? (provider === "gemini" ? GEMINI_MODEL : undefined),
    batchMode: context.batchMode,
    bulletsSent: context.bulletsSent,
    suggestionsReturned: result.suggestions.length,
    timestamp,
  };
}

export { mockProvider } from "@/lib/ai/mock";
