import type { ExperienceDuration } from "@/types/resume";

const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const PRESENT_PATTERN = /^(present|current|now)$/i;

const RANGE_SPLIT_PATTERN = /\s*[-–—~]|(?:\s+to\s+)/i;

const MONTH_YEAR_PATTERN =
  /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})$/i;

type MonthYear = {
  year: number;
  month: number;
  label: string;
};

function normalizeMonthName(token: string): string {
  return token.trim().toLowerCase();
}

export function parseMonthYear(value: string): MonthYear | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const monthYearMatch = trimmed.match(MONTH_YEAR_PATTERN);
  if (monthYearMatch) {
    const month = MONTH_NAMES[normalizeMonthName(monthYearMatch[1])];
    const year = Number(monthYearMatch[2]);
    if (month === undefined || Number.isNaN(year)) return null;
    return {
      year,
      month,
      label: `${monthYearMatch[1]} ${year}`,
    };
  }

  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    const year = Number(yearOnlyMatch[1]);
    return { year, month: 0, label: String(year) };
  }

  return null;
}

/** Sort key from the end of a date range; higher = more recent. Present ranks latest. */
export function getDateRangeEndSortKey(
  dateRange: string | undefined,
  referenceDate: Date = new Date(),
): { sortKey: number; hasDate: boolean } {
  if (!dateRange?.trim()) {
    return { sortKey: 0, hasDate: false };
  }

  const trimmed = dateRange.trim();
  const parts = trimmed.split(RANGE_SPLIT_PATTERN).map((part) => part.trim());

  if (parts.length < 2) {
    const single = parseMonthYear(trimmed);
    if (single) {
      return { sortKey: single.year * 12 + single.month, hasDate: true };
    }
    const yearOnly = trimmed.match(/\b(19|20)\d{2}\b/);
    if (yearOnly) {
      const year = Number(yearOnly[0]);
      return { sortKey: year * 12 + 11, hasDate: true };
    }
    return { sortKey: 0, hasDate: false };
  }

  const endLabel = parts[parts.length - 1];
  if (PRESENT_PATTERN.test(endLabel)) {
    return {
      sortKey: referenceDate.getFullYear() * 12 + referenceDate.getMonth() + 100_000,
      hasDate: true,
    };
  }

  const end = parseMonthYear(endLabel);
  if (!end) {
    const yearOnly = endLabel.match(/\b(19|20)\d{2}\b/);
    if (yearOnly) {
      return { sortKey: Number(yearOnly[0]) * 12 + 11, hasDate: true };
    }
    return { sortKey: 0, hasDate: false };
  }

  return { sortKey: end.year * 12 + end.month, hasDate: true };
}

export function formatDuration(totalMonths: number): string {
  if (totalMonths < 0) return "0 mos";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return `${months} mos`;
  }

  const yearLabel = years === 1 ? "1 yr" : `${years} yrs`;
  return `${yearLabel} ${months} mos`;
}

/** Inclusive month count (Mar–Jun counts Mar, Apr, May, and Jun). */
function monthsBetween(start: MonthYear, end: MonthYear): number {
  return end.year * 12 + end.month - (start.year * 12 + start.month) + 1;
}

export function calculateExperienceDuration(
  dateRange: string,
  referenceDate: Date = new Date(),
): ExperienceDuration {
  const trimmed = dateRange.trim();
  if (!trimmed) {
    return { parseWarning: "Date range is empty." };
  }

  const parts = trimmed.split(RANGE_SPLIT_PATTERN).map((part) => part.trim());
  if (parts.length < 2) {
    return {
      parseWarning: `Could not split date range: "${trimmed}"`,
    };
  }

  const start = parseMonthYear(parts[0]);
  const endLabel = parts[parts.length - 1];
  let end: MonthYear | null = null;

  if (PRESENT_PATTERN.test(endLabel)) {
    end = {
      year: referenceDate.getFullYear(),
      month: referenceDate.getMonth(),
      label: "Present",
    };
  } else {
    end = parseMonthYear(endLabel);
  }

  if (!start || !end) {
    return {
      parseWarning: `Could not parse month-year values in "${trimmed}"`,
    };
  }

  const totalMonths = monthsBetween(start, end);
  if (totalMonths < 0) {
    return {
      startDate: start.label,
      endDate: end.label,
      parseWarning: "End date is before start date.",
    };
  }

  return {
    startDate: start.label,
    endDate: end.label,
    totalMonths,
    display: formatDuration(totalMonths),
  };
}
