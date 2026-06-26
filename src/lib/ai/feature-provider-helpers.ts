import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";

export const GEMINI_API_KEY_REQUIRED_ERROR =
  "GEMINI_API_KEY is required when AI_PROVIDER=gemini.";

export function resolveActiveProviderId(providerId?: string | null): AIProviderId {
  return resolveProviderId(providerId ?? process.env.AI_PROVIDER);
}

export function requireGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(GEMINI_API_KEY_REQUIRED_ERROR);
  }
  return apiKey;
}

export function assertOpenAiFeatureNotImplemented(featureName: string): never {
  throw new Error(`OpenAI ${featureName} is not implemented yet.`);
}

export type FeatureProviderStatusBase = {
  provider: AIProviderId;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  configured: boolean;
  configurationError?: string;
};

export function buildFeatureProviderStatus<TExtra extends Record<string, unknown> = Record<string, never>>(
  options: {
    geminiModelName?: string;
    openAiFeatureName?: string;
    extra?: TExtra;
  } = {},
): FeatureProviderStatusBase & TExtra {
  const provider = resolveProviderId(process.env.AI_PROVIDER);
  const isMock = provider === "mock";
  let configured = true;
  let configurationError: string | undefined;

  if (provider === "gemini" && !process.env.GEMINI_API_KEY?.trim()) {
    configured = false;
    configurationError = GEMINI_API_KEY_REQUIRED_ERROR;
  }

  if (provider === "openai" && options.openAiFeatureName) {
    configured = false;
    configurationError = `OpenAI ${options.openAiFeatureName} is not implemented yet.`;
  }

  return {
    provider,
    isMock,
    providerLabel: getProviderLabel(provider),
    modelName: provider === "gemini" ? options.geminiModelName : undefined,
    configured,
    configurationError,
    ...(options.extra ?? ({} as TExtra)),
  };
}
