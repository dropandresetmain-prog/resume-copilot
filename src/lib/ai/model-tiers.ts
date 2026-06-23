export const MODEL_TIERS = ["standard", "enhanced", "premium"] as const;

export type ModelTier = (typeof MODEL_TIERS)[number];

export const MODEL_TIER_LABELS: Record<
  ModelTier,
  { label: string; hint: string; apiPrimary: string }
> = {
  standard: {
    label: "Standard — Gemini 2.5 Flash",
    hint: "Fastest and cheapest default",
    apiPrimary: "gemini-2.5-flash",
  },
  enhanced: {
    label: "Enhanced — Gemini 3 Flash",
    hint: "Better quality, moderate cost increase",
    apiPrimary: "gemini-3-flash-preview",
  },
  premium: {
    label: "Premium — Gemini 3.5 Flash",
    hint: "Best effort for high-stakes applications, slower and more expensive",
    apiPrimary: "gemini-3.5-flash",
  },
};

export const GEMINI_TIER_FALLBACK_MODEL = "gemini-2.5-flash-lite";

export class InvalidModelTierError extends Error {
  constructor(message = "Invalid model tier.") {
    super(message);
    this.name = "InvalidModelTierError";
  }
}

export function isModelTier(value: string): value is ModelTier {
  return (MODEL_TIERS as readonly string[]).includes(value);
}

/** Missing/empty → standard. Invalid values throw. */
export function parseModelTier(value: unknown): ModelTier {
  if (value === undefined || value === null || value === "") {
    return "standard";
  }
  if (typeof value !== "string") {
    throw new InvalidModelTierError("Model tier must be a string.");
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "standard";
  }
  if (!isModelTier(normalized)) {
    throw new InvalidModelTierError(`Unknown model tier: ${value}`);
  }
  return normalized;
}

export function getPrimaryModelIdForTier(tier: ModelTier): string {
  return MODEL_TIER_LABELS[tier].apiPrimary;
}

export function resolveModelsForTier(tier: ModelTier): string[] {
  const primary = getPrimaryModelIdForTier(tier);
  return primary === GEMINI_TIER_FALLBACK_MODEL
    ? [primary]
    : [primary, GEMINI_TIER_FALLBACK_MODEL];
}

export function isModelFallbackApplied(
  requestedTier: ModelTier,
  actualModelId: string,
): boolean {
  return actualModelId !== getPrimaryModelIdForTier(requestedTier);
}

export type ModelSelectionMetadata = {
  requestedTier: ModelTier;
  requestedModelId: string;
  actualModelId: string;
  fallbackApplied: boolean;
};

export function buildModelSelectionMetadata(
  requestedTier: ModelTier,
  actualModelId: string,
): ModelSelectionMetadata {
  const requestedModelId = getPrimaryModelIdForTier(requestedTier);
  return {
    requestedTier,
    requestedModelId,
    actualModelId,
    fallbackApplied: actualModelId !== requestedModelId,
  };
}
