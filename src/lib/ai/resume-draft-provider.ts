import { GEMINI_MODEL } from "@/lib/ai/config";
import { generateMockResumeDraft } from "@/lib/ai/resume-draft-mock";
import { generateResumeDraftWithGemini } from "@/lib/ai/resume-draft-gemini";
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
    modelName: provider === "gemini" ? GEMINI_MODEL : undefined,
    configured,
    configurationError,
    supportsResumeDraft: true,
  };
}

export async function generateResumeDraftWithAI(
  input: ResumeDraftGenerationInput,
  providerId?: string | null,
): Promise<ResumeDraftGenerationResult & { providerId: AIProviderId }> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await generateResumeDraftWithGemini(input, apiKey);
    return { ...result, providerId: "gemini" };
  }

  if (provider === "openai") {
    throw new Error("OpenAI resume draft generation is not implemented yet.");
  }

  return {
    ...generateMockResumeDraft(input),
    providerId: "mock",
  };
}

export function toResumeDraftApiResponse(
  result: ResumeDraftGenerationResult & { providerId: AIProviderId },
  context: {
    inputSnapshot: ResumeDraftGenerationResponse["inputSnapshot"];
    modelName?: string;
    timestamp?: string;
  },
): ResumeDraftGenerationResponse {
  const provider = resolveProviderId(result.providerId);
  const timestamp = context.timestamp ?? new Date().toISOString();

  return {
    content: result.content,
    rationale: result.rationale,
    inputSnapshot: context.inputSnapshot,
    provider,
    isMock: provider === "mock",
    providerLabel: getProviderLabel(provider),
    modelName: context.modelName ?? (provider === "gemini" ? GEMINI_MODEL : undefined),
    timestamp,
  };
}
