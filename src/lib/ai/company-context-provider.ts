import { GEMINI_MODEL } from "@/lib/ai/config";
import { generateCompanyContextWithGemini } from "@/lib/ai/company-context-gemini";
import { generateMockCompanyContext } from "@/lib/ai/company-context-mock";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  CompanyContext,
  CompanyContextGenerationRequest,
  CompanyContextGenerationResponse,
} from "@/types/company-context";

export function getCompanyContextProviderStatus() {
  const provider = resolveProviderId(process.env.AI_PROVIDER);
  const isMock = provider === "mock";
  let configured = true;
  let configurationError: string | undefined;

  if (provider === "gemini" && !process.env.GEMINI_API_KEY?.trim()) {
    configured = false;
    configurationError = "GEMINI_API_KEY is required when AI_PROVIDER=gemini.";
  }

  return {
    provider,
    isMock,
    providerLabel: getProviderLabel(provider),
    modelName: provider === "gemini" ? GEMINI_MODEL : undefined,
    configured,
    configurationError,
    supportsCompanyContext: true,
  };
}

export async function generateCompanyContextWithAI(
  input: CompanyContextGenerationRequest,
  providerId?: string | null,
): Promise<CompanyContext & { providerId: AIProviderId }> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await generateCompanyContextWithGemini(input, apiKey);
    return { ...result, providerId: "gemini" };
  }

  if (provider === "openai") {
    throw new Error("OpenAI company context generation is not implemented yet.");
  }

  const result = generateMockCompanyContext(input);
  return { ...result, providerId: "mock" };
}

export function toCompanyContextApiResponse(
  result: CompanyContext & { providerId: AIProviderId },
  options: { modelName?: string; timestamp: string },
): CompanyContextGenerationResponse {
  const status = getCompanyContextProviderStatus();
  return {
    ...result,
    provider: result.providerId,
    isMock: result.providerId === "mock",
    providerLabel: getProviderLabel(result.providerId),
    modelName: options.modelName ?? status.modelName,
    timestamp: options.timestamp,
  };
}
