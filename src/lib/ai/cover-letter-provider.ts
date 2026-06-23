import { GEMINI_MODEL_PRIMARY } from "@/lib/ai/config";
import { generateMockCoverLetter } from "@/lib/ai/cover-letter-mock";
import { generateCoverLetterWithGemini } from "@/lib/ai/cover-letter-gemini";
import { getPrimaryModelIdForTier, type ModelTier } from "@/lib/ai/model-tiers";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
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
  const provider = resolveProviderId(process.env.AI_PROVIDER);
  const isMock = provider === "mock";
  let configured = true;
  let configurationError: string | undefined;

  if (provider === "gemini" && !process.env.GEMINI_API_KEY?.trim()) {
    configured = false;
    configurationError = "GEMINI_API_KEY is required when AI_PROVIDER=gemini.";
  }

  if (provider === "openai") {
    configured = false;
    configurationError = "OpenAI cover letter generation is not implemented yet.";
  }

  return {
    provider,
    isMock,
    providerLabel: getProviderLabel(provider),
    modelName: provider === "gemini" ? GEMINI_MODEL_PRIMARY : undefined,
    configured,
    configurationError,
    supportsCoverLetter: true,
  };
}

export async function generateCoverLetterWithAI(
  input: CoverLetterGenerationInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<CoverLetterAIResult> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const modelTier = options?.modelTier ?? input.coverLetterModelTier ?? "standard";

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await generateCoverLetterWithGemini(input, apiKey, modelTier);
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
    throw new Error("OpenAI cover letter generation is not implemented yet.");
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

export function getCoverLetterDefaultModelLabel(tier: ModelTier = "standard"): string | undefined {
  return getPrimaryModelIdForTier(tier);
}
