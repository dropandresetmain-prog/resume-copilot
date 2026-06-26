import { GEMINI_MODEL } from "@/lib/ai/config";
import { buildFeatureProviderStatus, requireGeminiApiKey, resolveActiveProviderId } from "@/lib/ai/feature-provider-helpers";
import { generateCompanyResearchWithProvider } from "@/lib/company-context/research";
import { getProviderLabel } from "@/lib/ai/provider";
import { isFirecrawlConfigured } from "@/lib/firecrawl/scrape-company-website";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  CompanyContext,
  CompanyContextGenerationRequest,
  CompanyContextGenerationResponse,
} from "@/types/company-context";

export function getCompanyContextProviderStatus() {
  return buildFeatureProviderStatus({
    geminiModelName: GEMINI_MODEL,
    extra: {
      supportsCompanyContext: true as const,
      firecrawlConfigured: isFirecrawlConfigured(),
    },
  });
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
  const provider = resolveActiveProviderId(providerId);
  const apiKey = provider === "gemini" ? requireGeminiApiKey() : undefined;

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
