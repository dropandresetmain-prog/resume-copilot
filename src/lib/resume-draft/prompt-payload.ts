import type { ResumeDraftGenerationInput } from "@/types/resume-draft";

function normalizeComparableText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractMetricTokens(text: string): Set<string> {
  const matches = text.match(/(?:S\$|US\$|\$|€|£)?\d[\d,.]*(?:%|[kKmMbB](?:\b|$)?)?/gi) ?? [];
  return new Set(matches.map((metric) => metric.toLowerCase()));
}

/** True when `raw` contains numeric or scope facts not present in baseline text. */
export function rawTextAddsDistinctFacts(raw: string, baseline: string): boolean {
  const rawMetrics = extractMetricTokens(raw);
  const baselineMetrics = extractMetricTokens(baseline);
  for (const metric of rawMetrics) {
    if (!baselineMetrics.has(metric)) {
      return true;
    }
  }

  const rawNorm = normalizeComparableText(raw);
  const baselineNorm = normalizeComparableText(baseline);
  if (!rawNorm || !baselineNorm) {
    return rawNorm !== baselineNorm;
  }

  return rawNorm.length > baselineNorm.length + 20;
}

/**
 * Omit rawTexts that duplicate description or acceptedWording.
 * Keep variants that add distinct facts (e.g. extra metrics in source file wording).
 */
export function pruneRedundantRawTexts(
  rawTexts: readonly string[],
  description: string,
  acceptedWording?: string,
): string[] {
  const baselines = [description, acceptedWording]
    .map((text) => text?.trim())
    .filter((text): text is string => Boolean(text));
  const baselineCombined = baselines.join(" ");

  return rawTexts
    .map((raw) => raw.trim())
    .filter(Boolean)
    .filter((raw) => {
      const normalized = normalizeComparableText(raw);
      if (baselines.some((baseline) => normalizeComparableText(baseline) === normalized)) {
        return false;
      }

      if (!baselineCombined.trim()) {
        return true;
      }

      return rawTextAddsDistinctFacts(raw, baselineCombined);
    });
}

/** Prompt-only compaction — does not mutate generation input used for validation. */
export function compactResumeDraftInputForPrompt(
  input: ResumeDraftGenerationInput,
): ResumeDraftGenerationInput {
  return {
    ...input,
    companyContext: undefined,
    experiences: input.experiences.map((experience) => ({
      ...experience,
      bullets: experience.bullets.map((bullet) => ({
        ...bullet,
        rawTexts: pruneRedundantRawTexts(
          bullet.rawTexts,
          bullet.description,
          bullet.acceptedWording,
        ),
      })),
    })),
  };
}

export function serializeResumeDraftPromptPayload(input: ResumeDraftGenerationInput): string {
  return JSON.stringify(compactResumeDraftInputForPrompt(input));
}
