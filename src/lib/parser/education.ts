/**
 * Education parsing heuristics.
 *
 * Expected structure (similar to work experience):
 *   Institution [+ location]
 *   Programme line(s) — multiple programmes allowed before date
 *   Date range line (standalone or on final programme line)
 *   Bullet lines (achievements, honours, scholarships — not classified)
 */

import {
  extractDateRangeFromLine,
  isRoleLine,
  parseBulletLine,
  parseCompanyLine,
  type ParsedBulletBlock,
} from "@/lib/parser/heuristics";

export type ParsedEducationBlock = {
  institution: string;
  location: string;
  programmes: string[];
  dateRange: string;
  rawHeader: string;
  rawProgrammeLines: string[];
  rawDateLine: string;
  bullets: string[];
};

const UNIVERSITY_HINT_PATTERN =
  /\b(university|college|institute|polytechnic|school)\b/i;

export function isDateOnlyLine(line: string): boolean {
  const extracted = extractDateRangeFromLine(line);
  return extracted !== null && extracted.rest.trim() === "";
}

function couldBeInstitutionLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isRoleLine(trimmed) && !isDateOnlyLine(trimmed)) return false;
  if (parseBulletLine(trimmed)) return false;
  return true;
}

function hasEducationDateAhead(lines: string[], start: number): boolean {
  for (let j = start + 1; j < Math.min(lines.length, start + 8); j += 1) {
    const trimmed = lines[j]?.trim();
    if (!trimmed) continue;
    if (parseBulletLine(trimmed)) return false;
    if (isDateOnlyLine(trimmed)) return true;
    const extracted = extractDateRangeFromLine(trimmed);
    if (extracted && extracted.rest.trim()) return true;
  }
  return false;
}

function looksLikeInstitutionLine(line: string): boolean {
  const parsed = parseCompanyLine(line);
  if (!parsed.company.trim()) return false;
  if (UNIVERSITY_HINT_PATTERN.test(parsed.company)) return true;
  if (parsed.location.trim()) return true;
  return false;
}

export function looksLikeNewEducationBlock(
  lines: string[],
  index: number,
): boolean {
  const line = lines[index]?.trim();
  if (!line || !couldBeInstitutionLine(line)) return false;
  if (!looksLikeInstitutionLine(line)) return false;
  return hasEducationDateAhead(lines, index);
}

function bulletToText(bullet: ParsedBulletBlock): string {
  if (bullet.keyword && bullet.description) {
    return `${bullet.keyword}: ${bullet.description}`;
  }
  return bullet.description || bullet.rawBulletText;
}

function collectEducationBullets(
  lines: string[],
  startIndex: number,
): { bullets: string[]; nextIndex: number } {
  const bullets: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (looksLikeNewEducationBlock(lines, i)) break;

    const parsedBullet = parseBulletLine(rawLine);
    if (parsedBullet) {
      bullets.push(bulletToText(parsedBullet));
      i += 1;
      continue;
    }

    if (isRoleLine(trimmed) || isDateOnlyLine(trimmed)) break;

    if (bullets.length > 0) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${trimmed}`.trim();
      i += 1;
      continue;
    }

    bullets.push(trimmed);
    i += 1;
  }

  return { bullets, nextIndex: i };
}

function blockToRawText(block: ParsedEducationBlock): string {
  return [
    block.rawHeader,
    ...block.rawProgrammeLines,
    block.rawDateLine,
    ...block.bullets,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseEducationLines(inputLines: string[]): {
  blocks: ParsedEducationBlock[];
  warnings: string[];
} {
  const lines = inputLines.map((line) => line.replace(/\t/g, "    ").trimEnd());
  const blocks: ParsedEducationBlock[] = [];
  const warnings: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (!looksLikeNewEducationBlock(lines, i)) {
      i += 1;
      continue;
    }

    const institutionParsed = parseCompanyLine(lines[i]);
    const programmes: string[] = [];
    const rawProgrammeLines: string[] = [];
    let dateRange = "";
    let rawDateLine = "";
    i += 1;

    while (i < lines.length) {
      const current = lines[i].trim();
      if (!current) {
        i += 1;
        continue;
      }

      if (looksLikeNewEducationBlock(lines, i)) break;

      if (isDateOnlyLine(current)) {
        const extracted = extractDateRangeFromLine(current)!;
        dateRange = extracted.dateRange;
        rawDateLine = current;
        i += 1;
        break;
      }

      if (isRoleLine(current)) {
        const extracted = extractDateRangeFromLine(current)!;
        if (extracted.rest.trim()) {
          programmes.push(extracted.rest.trim());
          rawProgrammeLines.push(current);
        }
        dateRange = extracted.dateRange;
        rawDateLine = current;
        i += 1;
        break;
      }

      if (parseBulletLine(current)) break;

      programmes.push(current);
      rawProgrammeLines.push(current);
      i += 1;
    }

    const { bullets, nextIndex } = collectEducationBullets(lines, i);

    blocks.push({
      institution: institutionParsed.company,
      location: institutionParsed.location,
      programmes,
      dateRange,
      rawHeader: institutionParsed.rawHeader,
      rawProgrammeLines,
      rawDateLine,
      bullets,
    });

    if (!dateRange) {
      warnings.push(
        `Education entry "${institutionParsed.company}" is missing a date range.`,
      );
    }

    if (programmes.length === 0 && dateRange && rawDateLine) {
      warnings.push(
        `Education entry "${institutionParsed.company}" has a date range but no programme lines.`,
      );
    }

    i = nextIndex;
  }

  if (blocks.length === 0 && lines.some((entry) => entry.trim())) {
    const joined = lines.map((l) => l.trim()).filter(Boolean).join(" ");
    if (UNIVERSITY_HINT_PATTERN.test(joined)) {
      warnings.push(
        "Education section found but no institution/programme/date blocks could be structured.",
      );
    }
  }

  return { blocks, warnings };
}

export { blockToRawText };
