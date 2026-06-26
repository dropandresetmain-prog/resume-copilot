import { GEMINI_MODEL_PRIMARY } from "@/lib/ai/config";
import {
  assertOpenAiFeatureNotImplemented,
  buildFeatureProviderStatus,
  requireGeminiApiKey,
  resolveActiveProviderId,
} from "@/lib/ai/feature-provider-helpers";
import { generateMockResumeDraft } from "@/lib/ai/resume-draft-mock";
import { generateResumeDraftWithGemini } from "@/lib/ai/resume-draft-gemini";
import { type ModelTier } from "@/lib/ai/model-tiers";
import {
  getProviderLabel,
  resolveProviderId,
} from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  ResumeDraftGenerationInput,
  ResumeDraftGenerationResponse,
  ResumeDraftGenerationResult,
  ResumeDraftProviderStatusResponse,
} from "@/types/resume-draft";

export type ResumeDraftAIResult = ResumeDraftGenerationResult & {
  providerId: AIProviderId;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
};

export function getResumeDraftProviderStatus(): ResumeDraftProviderStatusResponse {
  return buildFeatureProviderStatus({
    geminiModelName: GEMINI_MODEL_PRIMARY,
    openAiFeatureName: "resume draft generation",
    extra: { supportsResumeDraft: true as const },
  });
}

export async function generateResumeDraftWithAI(
  input: ResumeDraftGenerationInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<ResumeDraftAIResult> {
  const provider = resolveActiveProviderId(providerId);
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const result = await generateResumeDraftWithGemini(input, requireGeminiApiKey(), modelTier);
    return {
      content: result.content,
      rationale: result.rationale,
      draftStatus: result.draftStatus,
      providerId: "gemini",
      modelName: result.modelName,
      requestedModelTier: result.requestedModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
    };
  }

  if (provider === "openai") {
    assertOpenAiFeatureNotImplemented("resume draft generation");
  }

  return {
    ...generateMockResumeDraft(input),
    providerId: "mock",
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
  };
}

export function toResumeDraftApiResponse(
  result: ResumeDraftAIResult,
  context: {
    inputSnapshot: ResumeDraftGenerationResponse["inputSnapshot"];
    modelName?: string;
    requestedModelTier?: ModelTier;
    modelFallbackApplied?: boolean;
    timestamp?: string;
  },
): ResumeDraftGenerationResponse {
  const provider = resolveProviderId(result.providerId);
  const timestamp = context.timestamp ?? new Date().toISOString();

  return {
    content: result.content,
    rationale: result.rationale,
    inputSnapshot: context.inputSnapshot,
    draftStatus: result.draftStatus,
    provider,
    isMock: provider === "mock",
    providerLabel: getProviderLabel(provider),
    modelName: context.modelName ?? result.modelName,
    requestedModelTier: context.requestedModelTier ?? result.requestedModelTier,
    modelFallbackApplied: context.modelFallbackApplied ?? result.modelFallbackApplied,
    timestamp,
  };
}