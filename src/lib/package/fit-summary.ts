import type { ResumeFitAssessment } from "@/lib/resume-draft/layout";
import type { ResumeDraftRationale } from "@/types/resume-draft";

const MAX_FIT_SUMMARY_WORDS = 100;

function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Derives a package fit summary from saved generation output — no page-load AI call.
 */
export function buildPackageFitSummary(options: {
  rationale?: ResumeDraftRationale | null;
  fitAssessment?: ResumeFitAssessment | null;
}): string | null {
  const segments: string[] = [];

  if (options.rationale?.overall?.trim()) {
    segments.push(options.rationale.overall.trim());
  }

  if (options.fitAssessment) {
    segments.push(`Fit score ${options.fitAssessment.fitScore}/100.`);
    const strength = options.fitAssessment.keyStrengths[0];
    if (strength) {
      segments.push(strength);
    }
  }

  const combined = segments.join(" ").trim();
  if (!combined) {
    return null;
  }

  return truncateToWordLimit(combined, MAX_FIT_SUMMARY_WORDS);
}

export const PACKAGE_FIT_SUMMARY_MAX_WORDS = MAX_FIT_SUMMARY_WORDS;
