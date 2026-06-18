import type { JobDescriptionInput } from "@/types/jd";

const SUMMARY_MAX_LENGTH = 200;
const MIN_SENTENCE_LENGTH = 30;
const MIN_LINE_LENGTH = 20;

const SECTION_HEADER_PATTERN =
  /^(about(\s+the\s+role)?|requirements|responsibilities|qualifications|who we are|job description|overview)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(line: string): string[] {
  return line
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function extractMeaningfulSentences(rawText: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sentences: string[] = [];

  for (const line of lines) {
    if (line.length < MIN_LINE_LENGTH) continue;
    if (SECTION_HEADER_PATTERN.test(line)) continue;

    const lineSentences = splitSentences(line);
    if (lineSentences.length > 0) {
      for (const sentence of lineSentences) {
        if (sentence.length < MIN_SENTENCE_LENGTH) continue;
        sentences.push(sentence);
        if (sentences.length >= 2) return sentences;
      }
      continue;
    }

    if (line.length >= MIN_SENTENCE_LENGTH) {
      sentences.push(normalizeWhitespace(line));
      if (sentences.length >= 2) return sentences;
    }
  }

  return sentences;
}

function truncateSummary(summary: string): string {
  if (summary.length <= SUMMARY_MAX_LENGTH) {
    return summary;
  }

  const truncated = summary.slice(0, SUMMARY_MAX_LENGTH - 1).trimEnd();
  return `${truncated}…`;
}

/**
 * Heuristic one- or two-sentence summary for saved job cards.
 * No AI call; safe to run on every save.
 */
export function generateJobDescriptionSummary(
  input: Pick<JobDescriptionInput, "rawText" | "companyName" | "roleTitle">,
): string | undefined {
  const rawText = input.rawText.trim();
  if (!rawText) {
    return undefined;
  }

  const sentences = extractMeaningfulSentences(rawText);
  const body = sentences.slice(0, 2).join(" ").trim();

  const company = input.companyName?.trim();
  const role = input.roleTitle?.trim();
  const prefix = [company, role].filter(Boolean).join(" — ");

  let summary = "";
  if (prefix && body) {
    summary = `${prefix}: ${body}`;
  } else if (body) {
    summary = body;
  } else if (prefix) {
    summary = prefix;
  } else {
    summary = normalizeWhitespace(rawText).slice(0, SUMMARY_MAX_LENGTH);
  }

  summary = truncateSummary(summary);
  return summary || undefined;
}

/** Collapsed card preview: stored summary or a short raw-text fallback. */
export function getSavedJobPreviewText(
  job: Pick<{ rawText: string; summary?: string }, "rawText" | "summary">,
  maxLength = 160,
): string {
  const source = job.summary?.trim() || job.rawText.trim();
  if (source.length <= maxLength) {
    return source;
  }
  return `${source.slice(0, maxLength - 1).trimEnd()}…`;
}
