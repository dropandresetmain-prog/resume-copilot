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

const INTERNAL_PHRASE_PATTERNS: RegExp[] = [
  /_/,
  /resume[_\s-]?structure/i,
  /\bneeds[_\s-]?review\b/i,
  /\brepaired\b/i,
  /title:\s*detail/i,
  /\bvalidation\b/i,
  /\bschema\b/i,
  /\bformatting\b/i,
  /\bparser\b/i,
  /keyword[_\s-]?colon/i,
  /\bstructure repair\b/i,
  /\bplain additional experience\b/i,
  /\bglobalRiskFlags\b/i,
  /\bheuristicVersion\b/i,
];

const KNOWN_LABEL_EXPANSIONS: Record<string, string> = {
  cdd: "customer due diligence",
  gtm: "go-to-market",
  b2b: "B2B",
};

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

export function isUserFacingFitPhrase(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) {
    return false;
  }
  if (INTERNAL_PHRASE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false;
  }
  if (/^[a-z0-9_]+$/i.test(trimmed.replace(/\s+/g, "")) && trimmed.includes("_")) {
    return false;
  }
  return true;
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
  key = key.replace(/\s+experience$/, "");
  key = key.replace(/^gap:\s*/, "");
  key = key.replace(GAP_MODIFIER_PATTERN, "");
  key = key.replace(/[_-]/g, " ");
  return key.replace(/\s+/g, " ").trim();
}

function phrasesOverlap(left: string, right: string): boolean {
  return left === right || left.includes(right) || right.includes(left);
}

function humanizeKeyword(keyword: string): string | null {
  const trimmed = keyword.trim();
  if (!trimmed || !isUserFacingFitPhrase(trimmed)) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (KNOWN_LABEL_EXPANSIONS[lower]) {
    return KNOWN_LABEL_EXPANSIONS[lower];
  }

  if (trimmed.includes("_")) {
    return null;
  }

  if (/^[a-z]{2,3}$/i.test(trimmed) && !KNOWN_LABEL_EXPANSIONS[lower]) {
    return null;
  }

  return lower.replace(/[_-]/g, " ");
}

function polishYourPhrase(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (/^your\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^your\s+/i, "");
    return `your ${rest.toLowerCase().replace(/[_-]/g, " ")}`;
  }
  return `your ${trimmed.toLowerCase().replace(/[_-]/g, " ")}`;
}

function humanizeGapPhrase(text: string): string | null {
  let gap = toSecondPerson(text.trim().replace(/^Gap:\s*/i, ""));
  gap = gap.replace(GAP_MODIFIER_PATTERN, "");
  gap = gap.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (!gap || !isUserFacingFitPhrase(gap)) {
    return null;
  }
  return gap;
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

function rewriteStrengthAsYour(text: string): string | null {
  let normalized = stripCandidateLanguage(text.trim());
  if (!isUserFacingFitPhrase(normalized)) {
    return null;
  }

  normalized = normalized.replace(/^strong\s+/i, "");
  normalized = normalized.replace(
    /^relevant\s+approved\s+keywords\s+incorporated$/i,
    "approved keyword alignment",
  );
  normalized = normalized.replace(
    /^inventory-backed\s+experience\s+included$/i,
    "inventory-backed experience",
  );
  normalized = normalized.replace(/\s+experience coverage$/i, " experience");

  if (!isUserFacingFitPhrase(normalized)) {
    return null;
  }

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
    const humanized = humanizeKeyword(keyword);
    if (humanized) {
      candidates.push(`your ${humanized} experience`);
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
    const gap = humanizeGapPhrase(omission);
    if (gap) {
      candidates.push(gap);
    }
  }

  for (const flag of fitAssessment?.riskFlags ?? []) {
    const gap = humanizeGapPhrase(flag);
    if (gap) {
      candidates.push(gap);
    }
  }

  return dedupeNormalizedPhrases(candidates, 2);
}

function formatReadableList(items: string[]): string {
  const labels = items
    .map((item) => item.replace(/^your\s+/, "").trim())
    .filter(Boolean);

  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function buildPositioningSentence(
  strengths: string[],
  gaps: string[],
  rationale?: ResumeDraftRationale | null,
  fitAssessment?: ResumeFitAssessment | null,
): string | null {
  const toneNotes = rationale?.toneNotes?.trim();
  if (toneNotes) {
    const normalized = toSecondPerson(toneNotes).trim();
    const toneShouldBe = normalized.match(/^tone should be\s+(.+)$/i);
    if (toneShouldBe?.[1]) {
      const themes = toneShouldBe[1].replace(/\.$/, "").trim();
      if (themes && isUserFacingFitPhrase(themes)) {
        return `Position yourself around ${sentenceCaseClause(themes)}.`;
      }
    } else if (/^lead with/i.test(normalized) && isUserFacingFitPhrase(normalized)) {
      return `Position yourself to ${sentenceCaseClause(normalized)}.`;
    } else if (isUserFacingFitPhrase(normalized)) {
      return `Position yourself around ${sentenceCaseClause(normalized)}.`;
    }
  }

  const keyword = rationale?.keywordUsage?.map(humanizeKeyword).find(Boolean);
  if (keyword) {
    return `Position yourself around your ${keyword} proof points in the opening summary.`;
  }

  const optimized = fitAssessment?.optimizedFor?.find((item) => {
    const lower = item.toLowerCase();
    return (
      isUserFacingFitPhrase(item) &&
      !lower.includes("one-page") &&
      !lower.includes("additional experience")
    );
  });

  if (optimized) {
    const clause = sentenceCaseClause(
      toSecondPerson(optimized.replace(/^Highlighted\s+/i, "lead with ").replace(/\.$/, "")),
    );
    return `Position yourself to ${clause}.`;
  }

  const strengthLabels = formatReadableList(strengths);
  const primaryGap = gaps[0];

  if (strengthLabels && primaryGap) {
    return `Position yourself around ${strengthLabels}, while addressing ${primaryGap}.`;
  }
  if (strengthLabels) {
    return `Position yourself around ${strengthLabels} in your summary and top bullets.`;
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

function buildThinRationaleSummary(
  fitAssessment?: ResumeFitAssessment | null,
  rationale?: ResumeDraftRationale | null,
): string {
  const verdictLine = buildVerdictLine(fitAssessment, rationale);
  return `${verdictLine} The saved rationale is too thin for a reliable read. Review the resume against the JD before exporting.`;
}

function hasMeaningfulUserContent(strengths: string[], gaps: string[]): boolean {
  return strengths.length > 0 || gaps.length > 0;
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

  const strengths = pickStrengths(fitAssessment, rationale);
  const gaps = pickGaps(fitAssessment, rationale);

  if (!hasMeaningfulUserContent(strengths, gaps)) {
    if (fitAssessment && Number.isFinite(fitAssessment.fitScore)) {
      return truncateToWordLimit(
        buildThinRationaleSummary(fitAssessment, rationale),
        PACKAGE_FIT_SUMMARY_MAX_WORDS,
      );
    }
    return null;
  }

  const sentences: string[] = [buildVerdictLine(fitAssessment, rationale)];

  const strengthLabels = formatReadableList(strengths);
  if (strengthLabels) {
    sentences.push(`Your strongest fits are ${strengthLabels}.`);
  }

  const gapLabels = formatReadableList(gaps);
  if (gapLabels) {
    sentences.push(`Key gaps to address: ${gapLabels}.`);
  }

  const positioning = buildPositioningSentence(strengths, gaps, rationale, fitAssessment);
  if (positioning) {
    sentences.push(positioning);
  }

  const combined = stripCandidateLanguage(toSecondPerson(sentences.join(" ").trim()));
  return truncateToWordLimit(combined, PACKAGE_FIT_SUMMARY_MAX_WORDS);
}

export function packageFitSummaryContainsVerdict(summary: string): boolean {
  return VERDICT_LABELS.some((label) => summary.includes(label));
}

export function countFitSummaryWords(summary: string): number {
  return summary.trim().split(/\s+/).filter(Boolean).length;
}
