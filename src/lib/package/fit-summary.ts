import type { ResumeFitAssessment } from "@/lib/resume-draft/layout";
import type { ResumeDraftRationale } from "@/types/resume-draft";

export const PACKAGE_FIT_SUMMARY_MAX_WORDS = 100;

export const PACKAGE_FIT_SUMMARY_UNAVAILABLE =
  "Fit read unavailable until this package has enough generation rationale.";

export type PackageFitVerdict = "Strong fit" | "Good fit" | "Stretch fit" | "Weak fit";

const VERDICT_LABELS: PackageFitVerdict[] = [
  "Strong fit",
  "Good fit",
  "Stretch fit",
  "Weak fit",
];

const GAP_MODIFIER_PATTERN = /^(?:limited|lack of|missing|no)\s+/i;

function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function fitScoreToVerdict(score: number): PackageFitVerdict {
  if (score >= 85) {
    return "Strong fit";
  }
  if (score >= 70) {
    return "Good fit";
  }
  if (score >= 55) {
    return "Stretch fit";
  }
  return "Weak fit";
}

function hasEnoughFitSignal(
  rationale?: ResumeDraftRationale | null,
  fitAssessment?: ResumeFitAssessment | null,
): boolean {
  if (fitAssessment && Number.isFinite(fitAssessment.fitScore)) {
    return true;
  }
  if (!rationale) {
    return false;
  }
  return (
    Boolean(rationale.keywordUsage?.length) ||
    Boolean(rationale.omissions?.length) ||
    Boolean(rationale.toneNotes?.trim()) ||
    Boolean(rationale.overall?.trim())
  );
}

function toSecondPerson(text: string): string {
  return text
    .replace(/\bthe candidate(?:'s)?\b/gi, "your")
    .replace(/\bcandidate(?:'s)?\b/gi, "your")
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthey\b/gi, "you")
    .replace(/\bthem\b/gi, "you");
}

function stripCandidateLanguage(text: string): string {
  return text.replace(/\bthe candidate(?:'s)?\b/gi, "your").replace(/\bcandidate\b/gi, "you");
}

function sentenceCaseClause(text: string): string {
  const trimmed = text.trim().replace(/\.$/, "");
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

export function normalizePhraseKey(text: string): string {
  let key = text.toLowerCase().trim();
  key = key.replace(/^your\s+/, "");
  key = key.replace(/\s+alignment$/, "");
  key = key.replace(/^gap:\s*/, "");
  key = key.replace(GAP_MODIFIER_PATTERN, "");
  return key.replace(/\s+/g, " ").trim();
}

function phrasesOverlap(left: string, right: string): boolean {
  return left === right || left.includes(right) || right.includes(left);
}

function polishYourPhrase(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (/^your\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^your\s+/i, "");
    return `your ${rest.toLowerCase()}`;
  }
  return `your ${trimmed.toLowerCase()}`;
}

function polishGapPhrase(text: string): string {
  let gap = toSecondPerson(text.trim().replace(/^Gap:\s*/i, ""));
  gap = gap.replace(GAP_MODIFIER_PATTERN, "");
  return gap.trim().toLowerCase();
}

function dedupeNormalizedPhrases(phrases: string[], maxItems: number): string[] {
  const accepted: string[] = [];
  const acceptedKeys: string[] = [];

  const sorted = [...phrases]
    .map((phrase) => phrase.trim())
    .filter(Boolean)
    .sort((left, right) => left.length - right.length);

  for (const phrase of sorted) {
    const key = normalizePhraseKey(phrase);
    if (!key) {
      continue;
    }
    if (acceptedKeys.some((existing) => phrasesOverlap(existing, key))) {
      continue;
    }
    acceptedKeys.push(key);
    accepted.push(phrase);
    if (accepted.length >= maxItems) {
      break;
    }
  }

  return accepted;
}

function rewriteStrengthAsYour(text: string): string {
  let normalized = stripCandidateLanguage(text.trim());
  normalized = normalized.replace(/^strong\s+/i, "");
  normalized = normalized.replace(/^relevant\s+approved\s+keywords\s+incorporated$/i, "approved keyword alignment");
  normalized = normalized.replace(/^inventory-backed\s+experience\s+included$/i, "inventory-backed experience");
  return polishYourPhrase(normalized);
}

function pickStrengths(
  fitAssessment?: ResumeFitAssessment | null,
  rationale?: ResumeDraftRationale | null,
): string[] {
  const candidates: string[] = [];

  for (const item of fitAssessment?.keyStrengths ?? []) {
    const rewritten = rewriteStrengthAsYour(item);
    if (rewritten) {
      candidates.push(rewritten);
    }
  }

  for (const keyword of rationale?.keywordUsage ?? []) {
    const trimmed = keyword.trim();
    if (trimmed) {
      candidates.push(polishYourPhrase(`${trimmed} alignment`));
    }
  }

  return dedupeNormalizedPhrases(candidates, 2);
}

function pickGaps(
  fitAssessment?: ResumeFitAssessment | null,
  rationale?: ResumeDraftRationale | null,
): string[] {
  const candidates: string[] = [];

  for (const omission of rationale?.omissions ?? []) {
    const gap = polishGapPhrase(omission);
    if (gap) {
      candidates.push(gap);
    }
  }

  for (const flag of fitAssessment?.riskFlags ?? []) {
    const gap = polishGapPhrase(flag);
    if (gap) {
      candidates.push(gap);
    }
  }

  return dedupeNormalizedPhrases(candidates, 2);
}

function pickPositioningAngle(
  fitAssessment?: ResumeFitAssessment | null,
  rationale?: ResumeDraftRationale | null,
): string | null {
  const toneNotes = rationale?.toneNotes?.trim();
  if (toneNotes) {
    return sentenceCaseClause(toSecondPerson(toneNotes));
  }

  const keyword = rationale?.keywordUsage?.[0]?.trim();
  if (keyword) {
    return `lead with your ${keyword.toLowerCase()} proof points in the opening summary`;
  }

  const optimized = fitAssessment?.optimizedFor?.find((item) => {
    const lower = item.toLowerCase();
    return !lower.includes("one-page") && !lower.includes("additional experience");
  });

  if (optimized) {
    return sentenceCaseClause(
      toSecondPerson(optimized.replace(/^Highlighted\s+/i, "lead with ").replace(/\.$/, "")),
    );
  }

  const roleStrength = fitAssessment?.keyStrengths?.[0];
  if (roleStrength) {
    return `emphasize ${rewriteStrengthAsYour(roleStrength)} in your summary and top bullets`;
  }

  return null;
}

function inferVerdictWithoutScore(
  rationale?: ResumeDraftRationale | null,
  fitAssessment?: ResumeFitAssessment | null,
): PackageFitVerdict {
  const omissionCount = rationale?.omissions?.length ?? 0;
  const gapCount = fitAssessment?.riskFlags?.length ?? 0;
  const keywordCount = rationale?.keywordUsage?.length ?? 0;

  if (omissionCount >= 2 || gapCount >= 2) {
    return "Stretch fit";
  }
  if (keywordCount >= 2 && omissionCount === 0) {
    return "Good fit";
  }
  if (keywordCount === 0 && omissionCount > 0) {
    return "Weak fit";
  }
  return "Good fit";
}

function buildVerdictLine(
  fitAssessment?: ResumeFitAssessment | null,
  rationale?: ResumeDraftRationale | null,
): string {
  const verdict =
    fitAssessment && Number.isFinite(fitAssessment.fitScore)
      ? fitScoreToVerdict(fitAssessment.fitScore)
      : inferVerdictWithoutScore(rationale, fitAssessment);

  if (fitAssessment && Number.isFinite(fitAssessment.fitScore)) {
    return `${verdict} (${fitAssessment.fitScore}/100).`;
  }

  return `${verdict}.`;
}

/**
 * Derives a package fit summary from saved generation output — no page-load AI call.
 */
export function buildPackageFitSummary(options: {
  rationale?: ResumeDraftRationale | null;
  fitAssessment?: ResumeFitAssessment | null;
}): string | null {
  const { rationale, fitAssessment } = options;

  if (!hasEnoughFitSignal(rationale, fitAssessment)) {
    return null;
  }

  const segments: string[] = [buildVerdictLine(fitAssessment, rationale)];

  const strengths = pickStrengths(fitAssessment, rationale);
  if (strengths.length > 0) {
    segments.push(`Your strongest fits: ${strengths.join("; ")}.`);
  }

  const gaps = pickGaps(fitAssessment, rationale);
  if (gaps.length > 0) {
    segments.push(`Key gaps: ${gaps.join("; ")}.`);
  }

  const positioning = pickPositioningAngle(fitAssessment, rationale);
  if (positioning) {
    segments.push(`Position yourself to ${positioning}.`);
  }

  const combined = stripCandidateLanguage(toSecondPerson(segments.join(" ").trim()));
  return truncateToWordLimit(combined, PACKAGE_FIT_SUMMARY_MAX_WORDS);
}

export function packageFitSummaryContainsVerdict(summary: string): boolean {
  return VERDICT_LABELS.some((label) => summary.includes(label));
}

export function countFitSummaryWords(summary: string): number {
  return summary.trim().split(/\s+/).filter(Boolean).length;
}
