import { getDateRangeEndSortKey } from "@/lib/date/duration";
import { EVIDENCE_SCORE } from "@/lib/evidence/constants";
import { countJdTermOverlap } from "@/lib/resume-draft/bullet-payload";
import {
  extractMetrics,
  isEarlyCareerExperience,
} from "@/lib/resume-draft/tailoring-quality";
import type { CollatedExperience } from "@/types/collated";

export const ROLE_SIGNAL_PATTERNS: RegExp[] = [
  /\bb2b\b/i,
  /\bsales\b/i,
  /\bbusiness development\b/i,
  /\baccount\b/i,
  /\bcommercial\b/i,
  /\bstakeholder\b/i,
  /\bpartnership\b/i,
  /\bfmcg\b/i,
  /\boperations\b/i,
  /\bproduct\b/i,
  /\bstrategy\b/i,
  /\bgo-to-market\b/i,
  /\bgrowth\b/i,
  /\bclient\b/i,
  /\bcustomer\b/i,
  /\bblockchain\b/i,
  /\bfintech\b/i,
  /\bplatform\b/i,
  /\bleadership\b/i,
  /\bengineering\b/i,
];

export function countRoleSignalMatches(text: string): string[] {
  return ROLE_SIGNAL_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) =>
    pattern.source.replace(/\\b/g, "").replace(/\\/g, ""),
  );
}

export function scoreEvidenceText(
  text: string,
  options: {
    jdTerms: readonly string[];
    hasAcceptedWording?: boolean;
    hasCitation?: boolean;
    dateRange?: string;
    experience?: Pick<CollatedExperience, "role" | "descriptor" | "dateRange" | "company">;
    referenceDate?: Date;
  },
): { score: number; matchedJdSignals: string[]; hasMetrics: boolean; recencySortKey?: number } {
  const jdOverlap = countJdTermOverlap(text, options.jdTerms);
  const matchedJdSignals = options.jdTerms.filter((term) =>
    text.toLowerCase().includes(term),
  );
  const roleSignals = countRoleSignalMatches(text);
  const metrics = extractMetrics(text);

  let score = jdOverlap * EVIDENCE_SCORE.jdTerm;
  score += roleSignals.length * EVIDENCE_SCORE.roleSignal;
  if (metrics.length > 0) {
    score += EVIDENCE_SCORE.metric;
  }
  if (options.hasAcceptedWording) {
    score += EVIDENCE_SCORE.acceptedWording;
  }
  if (options.hasCitation) {
    score += EVIDENCE_SCORE.citation;
  }

  let recencySortKey: number | undefined;
  if (options.dateRange) {
    const { sortKey, hasDate } = getDateRangeEndSortKey(
      options.dateRange,
      options.referenceDate,
    );
    if (hasDate) {
      recencySortKey = sortKey;
      score += Math.min(sortKey / 500_000, 25);
    }
  }

  if (options.experience && isEarlyCareerExperience(options.experience, options.referenceDate)) {
    const relevance = countJdTermOverlap(
      `${options.experience.role} ${text}`,
      options.jdTerms,
    );
    if (relevance < 2) {
      score -= 30;
    } else {
      score -= 10;
    }
  }

  return {
    score,
    matchedJdSignals: [...new Set([...matchedJdSignals, ...roleSignals])],
    hasMetrics: metrics.length > 0,
    recencySortKey,
  };
}

export function buildEvidenceRationale(
  displayLabel: string,
  matchedSignals: readonly string[],
  hasMetrics: boolean,
): string {
  if (matchedSignals.length === 0) {
    return `${displayLabel} — limited JD overlap; lower priority for this role.`;
  }
  const signalSample = matchedSignals.slice(0, 3).join(", ");
  const metricNote = hasMetrics ? " with quantified outcomes" : "";
  return `${displayLabel} — matches JD signals (${signalSample})${metricNote}.`;
}
