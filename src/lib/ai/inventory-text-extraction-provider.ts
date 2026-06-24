import { GEMINI_MODEL } from "@/lib/ai/config";
import { extractInventoryTextWithGemini } from "@/lib/ai/inventory-text-extraction-gemini";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import { extractInventoryTextWithMock } from "@/lib/inventory-text-extraction/mock";
import type { AIProviderId } from "@/lib/ai/types";
import type {
  InventoryTextExtractionApiResponse,
  InventoryTextExtractionRequest,
  InventoryTextExtractionResult,
} from "@/types/inventory-text-extraction";

export function getInventoryTextExtractionProviderStatus() {
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
  };
}

export async function extractInventoryTextWithAI(
  input: InventoryTextExtractionRequest,
  providerId?: string | null,
): Promise<InventoryTextExtractionResult> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);

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
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
      }
      return extractInventoryTextWithGemini(input, apiKey);
    }
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
