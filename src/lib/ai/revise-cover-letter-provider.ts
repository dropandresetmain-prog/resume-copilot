import { reviseMockCoverLetter } from "@/lib/ai/revise-cover-letter-mock";
import { reviseCoverLetterWithGemini } from "@/lib/ai/revise-cover-letter-gemini";
import { getPrimaryModelIdForTier, type ModelTier } from "@/lib/ai/model-tiers";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import { prepareCoverLetterRevisionResult } from "@/lib/cover-letter/revision-parse";
import type { CoverLetterRevisionPromptInput } from "@/lib/cover-letter/revision-prompt";
import type { CoverLetterRevisionResponse } from "@/types/cover-letter-draft";

export async function reviseCoverLetterWithAI(
  input: CoverLetterRevisionPromptInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<CoverLetterRevisionResponse & { providerId: AIProviderId }> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const timestamp = new Date().toISOString();
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await reviseCoverLetterWithGemini(input, apiKey, modelTier);
    return {
      body: result.body,
      wordCount: result.wordCount,
      warnings: result.warnings,
      provider,
      isMock: false,
      providerLabel: getProviderLabel(provider),
      modelName: result.modelName,
      requestedModelTier: result.requestedModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
      timestamp,
      providerId: provider,
    };
  }

  if (provider === "openai") {
    throw new Error("OpenAI cover letter revision is not implemented yet.");
  }

  const result = prepareCoverLetterRevisionResult(reviseMockCoverLetter(input));
  return {
    body: result.body,
    wordCount: result.wordCount,
    warnings: result.warnings,
    provider,
    isMock: true,
    providerLabel: getProviderLabel(provider),
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
    timestamp,
    providerId: provider,
  };
}

export function getCoverLetterRevisionModelName(
  providerId?: string | null,
  modelTier: ModelTier = "standard",
): string | undefined {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  return provider === "gemini" ? getPrimaryModelIdForTier(modelTier) : undefined;
}
