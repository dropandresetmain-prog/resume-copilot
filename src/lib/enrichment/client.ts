import { buildEnrichmentInput } from "@/lib/enrichment/payload";
import type { EnrichmentBatchMode } from "@/lib/enrichment/batch";
import type { CollatedInventory } from "@/types/collated";
import type {
  EnrichmentApiErrorResponse,
  EnrichmentApiResponse,
  ProviderStatusResponse,
} from "@/types/enrichment";

export type EnrichmentRequestOptions = {
  mode?: EnrichmentBatchMode;
  maxBullets?: number;
};

export type EnrichmentClientError = Error & {
  rawModelResponse?: string;
  statusCode?: number;
  providerStatus?: Partial<ProviderStatusResponse>;
};

export async function fetchProviderStatus(): Promise<ProviderStatusResponse> {
  const response = await fetch("/api/ai/enrich");
  const payload = (await response.json().catch(() => null)) as
    | ProviderStatusResponse
    | null;

  if (!response.ok || !payload?.provider) {
    throw new Error("Failed to load enrichment provider status.");
  }

  return payload;
}

export async function requestInventoryEnrichment(
  collated: CollatedInventory,
  options: EnrichmentRequestOptions = {},
): Promise<EnrichmentApiResponse> {
  const input = buildEnrichmentInput(collated);
  const response = await fetch("/api/ai/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      mode: options.mode ?? "full",
      maxBullets: options.maxBullets,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | (EnrichmentApiResponse & EnrichmentApiErrorResponse)
    | null;

  if (!response.ok) {
    const error = new Error(
      payload?.error ?? "AI enrichment request failed.",
    ) as EnrichmentClientError;
    error.rawModelResponse = payload?.rawModelResponse;
    error.statusCode = response.status;
    error.providerStatus = payload
      ? {
          provider: payload.provider,
          isMock: payload.isMock,
          providerLabel: payload.providerLabel,
          modelName: payload.modelName,
        }
      : undefined;
    throw error;
  }

  if (!payload?.suggestions) {
    throw new Error("AI enrichment response was invalid.");
  }

  return payload;
}
