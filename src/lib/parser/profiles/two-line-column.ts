/**
 * Layer 3 — format-specific profile for two-line column resumes:
 *
 *   Company (descriptor) ... Location
 *   Role ... Date Range
 *   Bullets
 */

import {
  isExperienceSectionHeader,
  isRoleLine,
  parseBulletLine,
  parseCompanyLine,
  parseRoleLine,
  type ParsedBulletBlock,
  type ParsedExperienceBlock,
} from "@/lib/parser/heuristics";
import type { ProfileParseResult } from "@/lib/parser/profiles/types";

export const TWO_LINE_COLUMN_PROFILE_ID = "two-line-column";

function findNextNonEmpty(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i].trim()) return i;
  }
  return -1;
}

function couldBeCompanyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isExperienceSectionHeader(trimmed)) return false;
  if (isRoleLine(trimmed)) return false;
  if (parseBulletLine(trimmed)) return false;
  return true;
}

function looksLikeNewExperienceBlock(lines: string[], index: number): boolean {
  const line = lines[index]?.trim();
  if (!line || !couldBeCompanyLine(line)) return false;

  const roleIndex = findNextNonEmpty(lines, index + 1);
  return roleIndex >= 0 && isRoleLine(lines[roleIndex]);
}

function appendBulletContinuation(
  bullets: ParsedBulletBlock[],
  continuation: string,
): void {
  const last = bullets[bullets.length - 1];
  last.description = `${last.description} ${continuation}`.trim();
  last.rawBulletText = `${last.rawBulletText} ${continuation}`.trim();
}

function collectBullets(
  lines: string[],
  startIndex: number,
  consumed: Set<number>,
): { bullets: ParsedBulletBlock[]; nextIndex: number } {
  const bullets: ParsedBulletBlock[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (looksLikeNewExperienceBlock(lines, i)) break;

    const parsedBullet = parseBulletLine(rawLine);
    if (parsedBullet) {
      bullets.push(parsedBullet);
      consumed.add(i);
      i += 1;
      continue;
    }

    if (isRoleLine(trimmed)) break;

    if (bullets.length > 0) {
      appendBulletContinuation(bullets, trimmed);
      consumed.add(i);
      i += 1;
      continue;
    }

    bullets.push({
      keyword: "",
      description: trimmed,
      rawBulletText: trimmed,
    });
    consumed.add(i);
    i += 1;
  }

  return { bullets, nextIndex: i };
}

function scoreConfidence(
  blocks: ParsedExperienceBlock[],
  lines: string[],
  consumed: Set<number>,
): Pick<ProfileParseResult<ParsedExperienceBlock>, "confidence" | "score"> {
  const nonEmpty = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter((entry) => entry.line.length > 0);

  const coverage =
    nonEmpty.length === 0
      ? 0
      : nonEmpty.filter((entry) => consumed.has(entry.index)).length /
        nonEmpty.length;

  if (blocks.length === 0) {
    return { confidence: "low", score: 0 };
  }

  const completeBlocks = blocks.filter(
    (block) =>
      block.company.trim() &&
      block.company !== "Unknown Company" &&
      block.role.trim() &&
      block.dateRange.trim(),
  ).length;

  const blockQuality = completeBlocks / blocks.length;
  const score = coverage * 0.35 + blockQuality * 0.65;

  if (score >= 0.75) {
    return { confidence: "high", score };
  }
  if (score >= 0.45) {
    return { confidence: "medium", score };
  }
  return { confidence: "low", score };
}

export function parseTwoLineColumnExperience(
  inputLines: string[],
): ProfileParseResult<ParsedExperienceBlock> {
  const lines = inputLines.map((line) => line.replace(/\t/g, "    ").trimEnd());
  const blocks: ParsedExperienceBlock[] = [];
  const warnings: string[] = [];
  const consumed = new Set<number>();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (isExperienceSectionHeader(line)) {
      consumed.add(i);
      i += 1;
      continue;
    }

    if (looksLikeNewExperienceBlock(lines, i)) {
      const roleIndex = findNextNonEmpty(lines, i + 1);
      if (roleIndex < 0) {
        i += 1;
        continue;
      }

      const companyParsed = parseCompanyLine(lines[i]);
      const roleParsed = parseRoleLine(lines[roleIndex]);
      const { bullets, nextIndex } = collectBullets(lines, roleIndex + 1, consumed);

      blocks.push({
        ...companyParsed,
        ...roleParsed,
        bullets,
      });

      consumed.add(i);
      consumed.add(roleIndex);
      i = nextIndex;
      continue;
    }

    if (isRoleLine(line)) {
      const roleParsed = parseRoleLine(line);
      const { bullets, nextIndex } = collectBullets(lines, i + 1, consumed);

      blocks.push({
        company: "Unknown Company",
        descriptor: "",
        location: "",
        rawHeader: "",
        ...roleParsed,
        bullets,
      });

      warnings.push(
        `Found role "${roleParsed.role}" without a preceding company header line.`,
      );

      consumed.add(i);
      i = nextIndex;
      continue;
    }

    i += 1;
  }

  if (blocks.length === 0 && lines.some((entry) => entry.trim())) {
    warnings.push(
      "No experience blocks detected with the two-line column profile (company line + role/date line).",
    );
  }

  const unconsumedLines = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter((entry) => entry.line && !consumed.has(entry.index))
    .map((entry) => lines[entry.index].trimEnd());

  const { confidence, score } = scoreConfidence(blocks, lines, consumed);

  if (confidence === "low" && blocks.length > 0) {
    warnings.push(
      "Work experience structure matched with low confidence; review unparsed section.",
    );
  }

  return {
    blocks,
    confidence,
    score,
    warnings,
    unconsumedLines,
    profileId: TWO_LINE_COLUMN_PROFILE_ID,
    profileName: "Two-line column (company + role/date)",
  };
}
