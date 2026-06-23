/**
 * Layer 3 — format-specific profile for inline / single-line experience entries:
 *
 *   Role at Company — Date Range
 *   Role, Company, Location — Date Range
 *   Date Range
 *   Role / Company (date-first format, date on preceding line)
 *   Bullets
 *
 * This profile is tried as a fallback when the two-line-column profile produces
 * low confidence. Never mutates or conflicts with two-line-column parsing.
 */

import {
  extractDateRangeFromLine,
  isExperienceSectionHeader,
  parseBulletLine,
  type ParsedBulletBlock,
  type ParsedExperienceBlock,
} from "@/lib/parser/heuristics";
import type { ProfileParseResult } from "@/lib/parser/profiles/types";

export const INLINE_EXPERIENCE_PROFILE_ID = "inline-experience";

/** Strip trailing separator chars that may be left after date extraction. */
function stripTrailingSeparators(text: string): string {
  return text.replace(/[\s\-–—|,]+$/, "").trim();
}

/**
 * Attempt to split a rest-of-line string (after date extraction) into
 * role and company. Returns null when it cannot make a confident split.
 */
function splitRoleCompany(
  rest: string,
): { role: string; company: string; location: string; confidence: "high" | "medium" | "low" } | null {
  const trimmed = stripTrailingSeparators(rest.trim());
  if (!trimmed) return null;

  // "Role at Company" — highest confidence
  const atMatch = trimmed.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return {
      role: atMatch[1].trim(),
      company: stripTrailingSeparators(atMatch[2]),
      location: "",
      confidence: "high",
    };
  }

  // "Role | Company" — high confidence (pipe not yet consumed by date)
  const pipeParts = trimmed.split(/\s*\|\s*/);
  if (pipeParts.length === 2) {
    return {
      role: pipeParts[0].trim(),
      company: stripTrailingSeparators(pipeParts[1]),
      location: "",
      confidence: "high",
    };
  }

  // Comma-separated: "Role, Company" or "Role, Company, Location"
  // Also: "Company, Role, Location" (ambiguous — use medium confidence)
  const parts = trimmed.split(/\s*,\s*/);
  if (parts.length === 2) {
    // Two parts: ambiguous, but the first tends to be the role in most formats
    return {
      role: parts[0].trim(),
      company: stripTrailingSeparators(parts[1]),
      location: "",
      confidence: "medium",
    };
  }
  if (parts.length >= 3) {
    // Three or more parts: treat last as location, first as role, second as company
    const location = parts[parts.length - 1].trim();
    return {
      role: parts[0].trim(),
      company: stripTrailingSeparators(parts[1]),
      location,
      confidence: "medium",
    };
  }

  // Single token with no separator: preserve as company, leave role empty
  return {
    role: "",
    company: trimmed,
    location: "",
    confidence: "low",
  };
}

/**
 * A "combined header line" contains both role/company text AND a date range on
 * the same line. Returns non-null when the line qualifies.
 */
function parseCombinedHeaderLine(
  line: string,
): {
  role: string;
  company: string;
  location: string;
  dateRange: string;
  rawRoleLine: string;
  headerConfidence: "high" | "medium" | "low";
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const extracted = extractDateRangeFromLine(trimmed);
  if (!extracted || !extracted.rest.trim()) return null;

  const split = splitRoleCompany(extracted.rest);
  if (!split) return null;

  return {
    role: split.role,
    company: split.company,
    location: split.location,
    dateRange: extracted.dateRange,
    rawRoleLine: trimmed,
    headerConfidence: split.confidence,
  };
}

/**
 * A "date-only line" is one whose entire content is a date range (no other text).
 */
function isDateOnlyLine(line: string): boolean {
  const extracted = extractDateRangeFromLine(line.trim());
  return extracted !== null && extracted.rest.trim() === "";
}

function appendBulletContinuation(bullets: ParsedBulletBlock[], continuation: string): void {
  const last = bullets[bullets.length - 1];
  last.description = `${last.description} ${continuation}`.trim();
  last.rawBulletText = `${last.rawBulletText} ${continuation}`.trim();
}

/**
 * Collect bullet lines that follow a role block, stopping when the next
 * experience block header is detected.
 */
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

    // Stop if a new combined-header line begins
    if (parseCombinedHeaderLine(trimmed)) break;

    // Stop if a date-only line begins (could be a new block's date)
    if (isDateOnlyLine(trimmed)) break;

    const parsedBullet = parseBulletLine(rawLine);
    if (parsedBullet) {
      bullets.push(parsedBullet);
      consumed.add(i);
      i += 1;
      continue;
    }

    // Non-bullet, non-header content — treat as plain text bullet
    if (bullets.length > 0) {
      // Continuation of prior bullet
      appendBulletContinuation(bullets, trimmed);
      consumed.add(i);
      i += 1;
      continue;
    }

    // Plain text before any bullet — treat as unlabeled bullet
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

  if (blocks.length === 0) return { confidence: "low", score: 0 };

  const completeBlocks = blocks.filter(
    (block) =>
      block.company.trim() &&
      block.company !== "Unknown Company" &&
      block.role.trim() &&
      block.dateRange.trim(),
  ).length;

  const blockQuality = completeBlocks / blocks.length;
  const score = coverage * 0.35 + blockQuality * 0.65;

  if (score >= 0.75) return { confidence: "high", score };
  if (score >= 0.45) return { confidence: "medium", score };
  return { confidence: "low", score };
}

export function parseInlineExperience(
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

    // Case 1: single-line "Role at Company — Date"
    const combined = parseCombinedHeaderLine(line);
    if (combined) {
      const { bullets, nextIndex } = collectBullets(lines, i + 1, consumed);

      if (combined.headerConfidence === "low" && !combined.role) {
        warnings.push(
          `Inline experience line could not separate role from company: "${line}". Preserved as-is.`,
        );
      }

      blocks.push({
        company: combined.company,
        descriptor: "",
        location: combined.location,
        role: combined.role,
        dateRange: combined.dateRange,
        rawHeader: "",
        rawRoleLine: combined.rawRoleLine,
        bullets,
      });

      consumed.add(i);
      i = nextIndex;
      continue;
    }

    // Case 2: date-first format — date on its own line, role/company on next
    if (isDateOnlyLine(line)) {
      const extracted = extractDateRangeFromLine(line)!;
      const nextIdx = i + 1;
      // Look for the next non-empty line to use as the role/company descriptor
      let roleLineIdx = nextIdx;
      while (roleLineIdx < lines.length && !lines[roleLineIdx].trim()) {
        roleLineIdx += 1;
      }

      if (roleLineIdx < lines.length) {
        const roleLine = lines[roleLineIdx].trim();
        // Must not itself be a date line or bullet
        if (!isDateOnlyLine(roleLine) && !parseBulletLine(roleLine)) {
          const split = splitRoleCompany(roleLine);
          const { bullets, nextIndex } = collectBullets(lines, roleLineIdx + 1, consumed);

          const role = split?.role ?? "";
          const company = split?.company ?? roleLine;
          const location = split?.location ?? "";

          blocks.push({
            company,
            descriptor: "",
            location,
            role,
            dateRange: extracted.dateRange,
            rawHeader: "",
            rawRoleLine: roleLine,
            bullets,
          });

          consumed.add(i);
          consumed.add(roleLineIdx);
          i = nextIndex;
          continue;
        }
      }
    }

    i += 1;
  }

  if (blocks.length === 0 && lines.some((entry) => entry.trim())) {
    warnings.push(
      "No experience blocks detected with the inline profile (single-line role/company/date).",
    );
  }

  const unconsumedLines = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter((entry) => entry.line && !consumed.has(entry.index))
    .map((entry) => lines[entry.index].trimEnd());

  const { confidence, score } = scoreConfidence(blocks, lines, consumed);

  if (confidence === "low" && blocks.length > 0) {
    warnings.push(
      "Work experience parsed with low confidence using inline profile; review unparsed section.",
    );
  }

  return {
    blocks,
    confidence,
    score,
    warnings,
    unconsumedLines,
    profileId: INLINE_EXPERIENCE_PROFILE_ID,
    profileName: "Inline (role/company/date on single line)",
  };
}
