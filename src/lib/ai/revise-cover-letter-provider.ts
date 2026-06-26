import { reviseMockCoverLetter } from "@/lib/ai/revise-cover-letter-mock";
import { reviseCoverLetterWithGemini } from "@/lib/ai/revise-cover-letter-gemini";
import {
  assertOpenAiFeatureNotImplemented,
  requireGeminiApiKey,
  resolveActiveProviderId,
} from "@/lib/ai/feature-provider-helpers";
import { type ModelTier } from "@/lib/ai/model-tiers";
import { getProviderLabel } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import { prepareCoverLetterRevisionResult } from "@/lib/cover-letter/revision-parse";
import type { CoverLetterRevisionPromptInput } from "@/lib/cover-letter/revision-prompt";
import type { CoverLetterRevisionResponse } from "@/types/cover-letter-draft";

export async function reviseCoverLetterWithAI(
  input: CoverLetterRevisionPromptInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<CoverLetterRevisionResponse & { providerId: AIProviderId }> {
  const provider = resolveActiveProviderId(providerId);
  const timestamp = new Date().toISOString();
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const result = await reviseCoverLetterWithGemini(input, requireGeminiApiKey(), modelTier);
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
      persisted: false,
      providerId: provider,
    };
  }

  if (provider === "openai") {
    assertOpenAiFeatureNotImplemented("cover letter revision");
  }

  const result = prepareCoverLetterRevisionResult(reviseMockCoverLetter(input), {
    candidateName: input.candidateName,
  });
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
    persisted: false,
    providerId: provider,
  };
}