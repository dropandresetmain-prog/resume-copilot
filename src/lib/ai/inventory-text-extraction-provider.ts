import { GEMINI_MODEL } from "@/lib/ai/config";
import { buildFeatureProviderStatus, requireGeminiApiKey, resolveActiveProviderId } from "@/lib/ai/feature-provider-helpers";
import { extractInventoryTextWithGemini } from "@/lib/ai/inventory-text-extraction-gemini";
import { getProviderLabel } from "@/lib/ai/provider";
import { extractInventoryTextWithMock } from "@/lib/inventory-text-extraction/mock";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  InventoryTextExtractionApiResponse,
  InventoryTextExtractionRequest,
  InventoryTextExtractionResult,
} from "@/types/inventory-text-extraction";

export function getInventoryTextExtractionProviderStatus() {
  return buildFeatureProviderStatus({ geminiModelName: GEMINI_MODEL });
}

export async function extractInventoryTextWithAI(
  input: InventoryTextExtractionRequest,
  providerId?: string | null,
): Promise<InventoryTextExtractionResult> {
  const provider = resolveActiveProviderId(providerId);

  if (!input.pastedText?.trim()) {
    return {
      sufficient: false,
      insufficientReason: "Paste some career text before extracting suggestions.",
      warnings: [],
      suggestions: [],
      providerId: provider,
    };
  }

  switch (provider) {
    case "gemini":
      return extractInventoryTextWithGemini(input, requireGeminiApiKey());
    case "mock":
    default:
      return extractInventoryTextWithMock(input);
  }
}

export function toInventoryTextExtractionApiResponse(
  result: InventoryTextExtractionResult,
  options: { modelName?: string; timestamp: string },
): InventoryTextExtractionApiResponse {
  const provider = result.providerId;
  return {
    ...result,
    provider,
    isMock: provider === "mock",
    providerLabel: getProviderLabel(provider),
    modelName: options.modelName ?? (provider === "gemini" ? GEMINI_MODEL : undefined),
    timestamp: options.timestamp,
  };
}

export type { AIProviderId };
