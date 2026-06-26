import { GEMINI_MODEL_PRIMARY } from "@/lib/ai/config";
import {
  assertOpenAiFeatureNotImplemented,
  buildFeatureProviderStatus,
  requireGeminiApiKey,
  resolveActiveProviderId,
} from "@/lib/ai/feature-provider-helpers";
import { generateMockCoverLetter } from "@/lib/ai/cover-letter-mock";
import { generateCoverLetterWithGemini } from "@/lib/ai/cover-letter-gemini";
import { type ModelTier } from "@/lib/ai/model-tiers";
import { getProviderLabel } from "@/lib/ai/provider";
import { prepareGeneratedCoverLetterResult } from "@/lib/cover-letter/generation-validation";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  CoverLetterGenerationInput,
  CoverLetterGenerationResponse,
  CoverLetterGenerationResult,
  CoverLetterProviderStatusResponse,
} from "@/types/cover-letter-draft";

export type CoverLetterAIResult = CoverLetterGenerationResult & {
  providerId: AIProviderId;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
};

export function getCoverLetterProviderStatus(): CoverLetterProviderStatusResponse {
  return buildFeatureProviderStatus({
    geminiModelName: GEMINI_MODEL_PRIMARY,
    openAiFeatureName: "cover letter generation",
    extra: { supportsCoverLetter: true as const },
  });
}

export async function generateCoverLetterWithAI(
  input: CoverLetterGenerationInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<CoverLetterAIResult> {
  const provider = resolveActiveProviderId(providerId);
  const modelTier = options?.modelTier ?? input.coverLetterModelTier ?? "standard";

  if (provider === "gemini") {
    const result = await generateCoverLetterWithGemini(input, requireGeminiApiKey(), modelTier);
    return {
      formalContent: result.formalContent,
      rationale: result.rationale,
      providerId: "gemini",
      modelName: result.modelName,
      requestedModelTier: result.requestedModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
    };
  }

  if (provider === "openai") {
    assertOpenAiFeatureNotImplemented("cover letter generation");
  }

  const result = prepareGeneratedCoverLetterResult(generateMockCoverLetter(input), {
    companyDisplayName: input.companyDisplayName ?? input.companyName,
  });
  return {
    ...result,
    providerId: "mock",
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
  };
}

export function toCoverLetterApiResponse(
  result: CoverLetterAIResult,
  options: {
    modelName?: string;
    requestedModelTier?: ModelTier;
    modelFallbackApplied?: boolean;
    timestamp: string;
  },
): CoverLetterGenerationResponse {
  return {
    formalContent: result.formalContent,
    rationale: result.rationale,
    provider: result.providerId,
    isMock: result.providerId === "mock",
    providerLabel: getProviderLabel(result.providerId),
    modelName: options.modelName ?? result.modelName,
    requestedModelTier: options.requestedModelTier ?? result.requestedModelTier,
    modelFallbackApplied: options.modelFallbackApplied ?? result.modelFallbackApplied,
    timestamp: options.timestamp,
  };
}