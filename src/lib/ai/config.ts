const DEFAULT_GEMINI_MODEL_PRIMARY = "gemini-2.5-flash";
const DEFAULT_GEMINI_MODEL_FALLBACK = "gemini-2.0-flash";

/** Primary Gemini model — override via GEMINI_MODEL_PRIMARY or legacy GEMINI_MODEL. */
export const GEMINI_MODEL_PRIMARY =
  process.env.GEMINI_MODEL_PRIMARY?.trim() ||
  process.env.GEMINI_MODEL?.trim() ||
  DEFAULT_GEMINI_MODEL_PRIMARY;

/** Fallback after transient failures on primary — override via GEMINI_MODEL_FALLBACK. */
export const GEMINI_MODEL_FALLBACK =
  process.env.GEMINI_MODEL_FALLBACK?.trim() || DEFAULT_GEMINI_MODEL_FALLBACK;

/** @deprecated Use GEMINI_MODEL_PRIMARY — kept for existing imports. */
export const GEMINI_MODEL = GEMINI_MODEL_PRIMARY;

export function resolveGeminiModelsForCall(): string[] {
  const models = [GEMINI_MODEL_PRIMARY, GEMINI_MODEL_FALLBACK].filter(
    (model, index, array) => Boolean(model) && array.indexOf(model) === index,
  );
  return models;
}
