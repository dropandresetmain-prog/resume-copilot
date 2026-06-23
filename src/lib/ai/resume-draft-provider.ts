import { GEMINI_MODEL_PRIMARY } from "@/lib/ai/config";
import { generateMockResumeDraft } from "@/lib/ai/resume-draft-mock";
import { generateResumeDraftWithGemini } from "@/lib/ai/resume-draft-gemini";
import { getPrimaryModelIdForTier, type ModelTier } from "@/lib/ai/model-tiers";
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
    configurationError = "OpenAI resume draft generation is not implemented yet.";
  }

  return {
    provider,
    isMock,
    providerLabel: getProviderLabel(provider),
    modelName: provider === "gemini" ? GEMINI_MODEL_PRIMARY : undefined,
    configured,
    configurationError,
    supportsResumeDraft: true,
  };
}

export async function generateResumeDraftWithAI(
  input: ResumeDraftGenerationInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<ResumeDraftAIResult> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await generateResumeDraftWithGemini(input, apiKey, modelTier);
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
    throw new Error("OpenAI resume draft generation is not implemented yet.");
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

export function getResumeDraftDefaultModelLabel(tier: ModelTier = "standard"): string | undefined {
  return getPrimaryModelIdForTier(tier);
}
