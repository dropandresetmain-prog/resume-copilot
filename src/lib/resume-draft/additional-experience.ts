import { getDateRangeEndSortKey } from "@/lib/date/duration";
import type { ResumeDraftAdditionalExperienceItem } from "@/types/resume-draft";

export type AdditionalExperienceTitleDetail = {
  title: string;
  detail: string;
};

export const DEFAULT_ADDITIONAL_EXPERIENCE_TITLE = "Other Past Roles";

const LANGUAGE_INTEREST_CATEGORY_PATTERN =
  /language|interest|hobby|technical skill|technical skills|^skills$/i;

const DATE_RANGE_IN_TEXT_PATTERN =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})/i;

const GENERIC_ADDITIONAL_CATEGORIES = new Set([
  "additional experience",
  "additional",
  "other",
  "other past roles",
]);

export function parseAdditionalExperienceItemText(
  text: string,
): AdditionalExperienceTitleDetail | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^([^:]{1,60}):\s*([\s\S]+)$/);
  if (!match) {
    return null;
  }

  const title = match[1].trim();
  const detail = match[2].trim();
  if (!title || !detail) {
    return null;
  }

  return { title, detail };
}

export function shouldExcludeFromAdditionalExperience(item: {
  category?: string;
  text: string;
}): boolean {
  const category = item.category?.trim() ?? "";
  if (LANGUAGE_INTEREST_CATEGORY_PATTERN.test(category)) {
    return true;
  }

  const text = item.text.trim();
  if (/^conversational\s+[a-z]+$/i.test(text)) {
    return true;
  }

  return false;
}

export function filterAdditionalExperienceItems<
  T extends ResumeDraftAdditionalExperienceItem,
>(items: T[]): T[] {
  return items.filter((item) => !shouldExcludeFromAdditionalExperience(item));
}

export function extractDateRangeFromPhrase(text: string): string | undefined {
  const trimmed = text.trim();
  const explicitRange = trimmed.match(DATE_RANGE_IN_TEXT_PATTERN);
  if (explicitRange) {
    return explicitRange[0];
  }

  const yearRange = trimmed.match(/\b(19|20)\d{2}\s*[-–—]\s*(Present|Current|(19|20)\d{2})\b/i);
  if (yearRange) {
    return yearRange[0];
  }

  const trailingYear = trimmed.match(/\b(19|20)\d{2}\b/);
  if (trailingYear) {
    return `Dec ${trailingYear[0]}`;
  }

  return undefined;
}

function sortReverseChronological<T>(
  items: readonly T[],
  getDateRange: (item: T) => string | undefined,
  referenceDate: Date = new Date(),
): T[] {
  const indexed = items.map((item, index) => ({
    item,
    index,
    ...getDateRangeEndSortKey(getDateRange(item), referenceDate),
  }));

  return [...indexed]
    .sort((a, b) => {
      if (a.hasDate && b.hasDate) {
        return b.sortKey - a.sortKey;
      }
      if (a.hasDate && !b.hasDate) {
        return -1;
      }
      if (!a.hasDate && b.hasDate) {
        return 1;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

export function sortAdditionalExperiencePhrases(phrases: string[]): string[] {
  return sortReverseChronological(phrases, extractDateRangeFromPhrase);
}

/** Split legacy comma-/semicolon-separated blobs into individual role phrases. */
export function splitPlainAdditionalExperiencePhrases(text: string): string[] {
  return text
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => part.split(/,\s*(?=[A-Z][\w&])/))
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractPlainPhrases(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (/[;\n]/.test(trimmed) || /,\s+[A-Z][\w&]/.test(trimmed)) {
    return splitPlainAdditionalExperiencePhrases(trimmed);
  }

  return [trimmed];
}

function resolveTitleFromCategory(category?: string): string | null {
  const normalized = category?.trim();
  if (!normalized) {
    return null;
  }

  if (GENERIC_ADDITIONAL_CATEGORIES.has(normalized.toLowerCase())) {
    return null;
  }

  if (normalized.length > 60) {
    return null;
  }

  return normalized;
}

export function formatAdditionalExperienceItemText(title: string, detail: string): string {
  return `${title.trim()}: ${detail.trim()}`;
}

/**
 * Repair plain/legacy Additional Experience rows into Title: Detail strings.
 * Multiple plain items are combined under Other Past Roles; existing colon items are preserved.
 */
export function normalizeAdditionalExperienceItems(
  items: ResumeDraftAdditionalExperienceItem[],
): ResumeDraftAdditionalExperienceItem[] {
  const filtered = filterAdditionalExperienceItems(items);
  const colonItems: ResumeDraftAdditionalExperienceItem[] = [];
  const plainPhrases: string[] = [];
  const plainRiskFlags: string[] = [];

  for (const item of filtered) {
    const text = item.text.trim();
    if (!text) {
      continue;
    }

    const parsed = parseAdditionalExperienceItemText(text);
    if (parsed) {
      colonItems.push({
        ...item,
        text: formatAdditionalExperienceItemText(parsed.title, parsed.detail),
      });
      continue;
    }

    const phrases = extractPlainPhrases(text);
    if (phrases.length === 1 && resolveTitleFromCategory(item.category)) {
      const title = resolveTitleFromCategory(item.category)!;
      colonItems.push({
        ...item,
        text: formatAdditionalExperienceItemText(title, phrases[0]!),
      });
      continue;
    }

    plainPhrases.push(...phrases);
    plainRiskFlags.push(...item.riskFlags);
  }

  const normalized = [...colonItems];

  if (plainPhrases.length > 0) {
    const detail = sortAdditionalExperiencePhrases(plainPhrases).join(", ");
    normalized.push({
      category: "Additional Experience",
      text: formatAdditionalExperienceItemText(DEFAULT_ADDITIONAL_EXPERIENCE_TITLE, detail),
      riskFlags: [...new Set(plainRiskFlags)],
    });
  }

  return normalized;
}

export function additionalExperienceNeedsNormalization(
  items: ResumeDraftAdditionalExperienceItem[],
): boolean {
  return filterAdditionalExperienceItems(items).some(
    (item) => item.text.trim() && !parseAdditionalExperienceItemText(item.text),
  );
}
