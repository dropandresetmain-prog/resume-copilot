import { GEMINI_MODEL } from "@/lib/ai/config";
import { generateMockCoverLetter } from "@/lib/ai/cover-letter-mock";
import { generateCoverLetterWithGemini } from "@/lib/ai/cover-letter-gemini";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  CoverLetterGenerationInput,
  CoverLetterGenerationResponse,
  CoverLetterGenerationResult,
  CoverLetterProviderStatusResponse,
} from "@/types/cover-letter-draft";

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
    modelName: provider === "gemini" ? GEMINI_MODEL : undefined,
    configured,
    configurationError,
    supportsCoverLetter: true,
  };
}

export async function generateCoverLetterWithAI(
  input: CoverLetterGenerationInput,
  providerId?: string | null,
): Promise<CoverLetterGenerationResult & { providerId: AIProviderId }> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await generateCoverLetterWithGemini(input, apiKey);
    return { ...result, providerId: "gemini" };
  }

  if (provider === "openai") {
    throw new Error("OpenAI cover letter generation is not implemented yet.");
  }

  const result = generateMockCoverLetter(input);
  return { ...result, providerId: "mock" };
}

export function toCoverLetterApiResponse(
  result: CoverLetterGenerationResult & { providerId: AIProviderId },
  options: { modelName?: string; timestamp: string },
): CoverLetterGenerationResponse {
  const status = getCoverLetterProviderStatus();
  return {
    ...result,
    provider: result.providerId,
    isMock: result.providerId === "mock",
    providerLabel: getProviderLabel(result.providerId),
    modelName: options.modelName ?? status.modelName,
    timestamp: options.timestamp,
  };
}
