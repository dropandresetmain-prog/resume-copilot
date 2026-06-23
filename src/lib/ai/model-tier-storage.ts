import { parseModelTier, type ModelTier } from "@/lib/ai/model-tiers";

const RESUME_MODEL_TIER_KEY = "resume-copilot:resume-model-tier";
const COVER_LETTER_MODEL_TIER_KEY = "resume-copilot:cover-letter-model-tier";

function readStoredTier(key: string): ModelTier {
  if (typeof window === "undefined") {
    return "standard";
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return "standard";
    }
    return parseModelTier(raw);
  } catch {
    return "standard";
  }
}

function writeStoredTier(key: string, tier: ModelTier): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, tier);
}

export function readStoredResumeModelTier(): ModelTier {
  return readStoredTier(RESUME_MODEL_TIER_KEY);
}

export function writeStoredResumeModelTier(tier: ModelTier): void {
  writeStoredTier(RESUME_MODEL_TIER_KEY, tier);
}

export function readStoredCoverLetterModelTier(): ModelTier {
  return readStoredTier(COVER_LETTER_MODEL_TIER_KEY);
}

export function writeStoredCoverLetterModelTier(tier: ModelTier): void {
  writeStoredTier(COVER_LETTER_MODEL_TIER_KEY, tier);
}

export function resolveResumeModelTierForDraft(input?: {
  draftTier?: ModelTier | null;
}): ModelTier {
  if (input?.draftTier) {
    return input.draftTier;
  }
  return readStoredResumeModelTier();
}

export function resolveCoverLetterModelTierForDraft(input?: {
  draftTier?: ModelTier | null;
}): ModelTier {
  if (input?.draftTier) {
    return input.draftTier;
  }
  return readStoredCoverLetterModelTier();
}
