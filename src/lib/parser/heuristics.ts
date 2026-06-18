/**
 * Shared parsing primitives for dates, bullets, and column-split lines.
 * Format-specific work experience parsing lives in parser profiles.
 */

import { parseTwoLineColumnExperience } from "@/lib/parser/profiles/two-line-column";

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

const DATE_RANGE_CORE = `(?:${MONTH}\\s*['']?\\d{2,4}|\\d{1,2}\\/\\d{4}|\\d{4})\\s*[-–—~to]+\\s*(?:${MONTH}\\s*['']?\\d{2,4}|\\d{1,2}\\/\\d{4}|\\d{4}|Present|Current|Now)`;

const DATE_RANGE_PATTERN = new RegExp(DATE_RANGE_CORE, "i");

const ROLE_DATE_END_PATTERN = new RegExp(
  `(\\b${DATE_RANGE_CORE})\\s*$`,
  "i",
);

const YEAR_RANGE_PATTERN =
  /\b((?:19|20)\d{2}\s*[-–—~]+\s*(?:(?:19|20)\d{2}|Present|Current|Now))\s*$/i;

const BULLET_PREFIX_PATTERN =
  /^[\s]*(?:[•●▪‣◦\-–—*►▸]|\d+[.)])\s*/;

const KEYWORD_BULLET_PATTERN =
  /^([A-Z][A-Za-z0-9\s/&'()-]+):\s*(.+)$/;

const EXPERIENCE_SECTION_PATTERN =
  /^(experience|work\s+experience|employment|professional\s+experience|career(\s+history)?|work\s+history)\b/i;

export type ParsedBulletBlock = {
  keyword: string;
  description: string;
  rawBulletText: string;
};

export type ParsedExperienceBlock = {
  company: string;
  descriptor: string;
  location: string;
  role: string;
  dateRange: string;
  rawHeader: string;
  rawRoleLine: string;
  bullets: ParsedBulletBlock[];
};

export function splitOnColumnGap(line: string): string[] {
  return line
    .split(/\s{2,}|\t+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isDateRangeText(text: string): boolean {
  const trimmed = text.trim();
  return DATE_RANGE_PATTERN.test(trimmed) || YEAR_RANGE_PATTERN.test(trimmed);
}

export function extractDateRangeFromLine(
  line: string,
): { dateRange: string; rest: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const endMatch = trimmed.match(ROLE_DATE_END_PATTERN);
  if (endMatch) {
    return {
      dateRange: endMatch[1].trim(),
      rest: trimmed.slice(0, endMatch.index).trim(),
    };
  }

  const yearMatch = trimmed.match(YEAR_RANGE_PATTERN);
  if (yearMatch) {
    return {
      dateRange: yearMatch[1].trim(),
      rest: trimmed.slice(0, yearMatch.index).trim(),
    };
  }

  const columns = splitOnColumnGap(trimmed);
  if (columns.length >= 2 && isDateRangeText(columns[columns.length - 1])) {
    return {
      dateRange: columns[columns.length - 1],
      rest: columns.slice(0, -1).join(" ").trim(),
    };
  }

  if (isDateRangeText(trimmed)) {
    return { dateRange: trimmed, rest: "" };
  }

  return null;
}

export function isRoleLine(line: string): boolean {
  return extractDateRangeFromLine(line) !== null;
}

export function parseCompanyLine(line: string): {
  company: string;
  descriptor: string;
  location: string;
  rawHeader: string;
} {
  const rawHeader = line.trim();
  const columns = splitOnColumnGap(rawHeader);

  let location = "";
  let main = rawHeader;

  if (columns.length >= 2) {
    location = columns[columns.length - 1];
    main = columns.slice(0, -1).join(" ").trim();
  }

  const parenMatch = main.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return {
      company: parenMatch[1].trim(),
      descriptor: parenMatch[2].trim(),
      location,
      rawHeader,
    };
  }

  // Fallback when Word collapses wide column spacing into single spaces:
  // "Company (descriptor) Singapore"
  const parenWithLocation = main.match(/^(.+?)\s*\(([^)]+)\)\s+(.+)$/);
  if (parenWithLocation && !location) {
    return {
      company: parenWithLocation[1].trim(),
      descriptor: parenWithLocation[2].trim(),
      location: parenWithLocation[3].trim(),
      rawHeader,
    };
  }

  return {
    company: main,
    descriptor: "",
    location,
    rawHeader,
  };
}

export function parseRoleLine(line: string): {
  role: string;
  dateRange: string;
  rawRoleLine: string;
} {
  const rawRoleLine = line.trim();
  const extracted = extractDateRangeFromLine(line);

  if (extracted) {
    return {
      role: extracted.rest,
      dateRange: extracted.dateRange,
      rawRoleLine,
    };
  }

  return { role: rawRoleLine, dateRange: "", rawRoleLine };
}

export function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_PREFIX_PATTERN, "").trim();
}

export function parseBulletLine(line: string): ParsedBulletBlock | null {
  const rawBulletText = line.trim();
  if (!rawBulletText) return null;

  const withoutPrefix = stripBulletPrefix(rawBulletText);
  const keywordMatch = withoutPrefix.match(KEYWORD_BULLET_PATTERN);

  if (keywordMatch) {
    return {
      keyword: keywordMatch[1].trim(),
      description: keywordMatch[2].trim(),
      rawBulletText,
    };
  }

  if (BULLET_PREFIX_PATTERN.test(rawBulletText)) {
    return {
      keyword: "",
      description: withoutPrefix,
      rawBulletText,
    };
  }

  return null;
}

export function isExperienceSectionHeader(line: string): boolean {
  return EXPERIENCE_SECTION_PATTERN.test(line.trim());
}

/** @deprecated Prefer parseExperienceSection from experience-parser.ts. */
export function parseWorkExperienceLines(inputLines: string[]): {
  blocks: ParsedExperienceBlock[];
  warnings: string[];
} {
  const result = parseTwoLineColumnExperience(inputLines);
  return {
    blocks: result.blocks,
    warnings: result.warnings,
  };
}

/** @deprecated Use parseWorkExperienceLines on a section-scoped line array. */
export function parseExperienceBlocks(text: string): {
  blocks: ParsedExperienceBlock[];
  warnings: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "    ").trimEnd());
  return parseWorkExperienceLines(lines);
}
