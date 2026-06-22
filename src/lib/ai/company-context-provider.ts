import { GEMINI_MODEL } from "@/lib/ai/config";
import { generateCompanyResearchWithProvider } from "@/lib/company-context/research";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import { isFirecrawlConfigured } from "@/lib/firecrawl/scrape-company-website";
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
    firecrawlConfigured: isFirecrawlConfigured(),
  };
}

export async function generateCompanyContextWithAI(
  input: CompanyContextGenerationRequest,
  providerId?: string | null,
): Promise<
  CompanyContext & {
    providerId: AIProviderId;
    firecrawlUsed?: boolean;
    researchWarning?: string;
  }
> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const apiKey = provider === "gemini" ? process.env.GEMINI_API_KEY?.trim() : undefined;

  return generateCompanyResearchWithProvider(input, provider, apiKey);
}

export function toCompanyContextApiResponse(
  result: CompanyContext & {
    providerId: AIProviderId;
    firecrawlUsed?: boolean;
    researchWarning?: string;
  },
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
    firecrawlUsed: result.firecrawlUsed,
    researchWarning: result.researchWarning,
  };
}
