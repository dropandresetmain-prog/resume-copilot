/**
 * Section-scoped parsers for education, skills, and text sections.
 * Section detection lives in section-detection.ts; orchestration in pipeline.ts.
 */

import {
  blockToRawText,
  parseEducationLines,
} from "@/lib/parser/education";
import type {
  ParsedEducationItem,
  ParsedSkillsSection,
  ParsedTextSection,
} from "@/types/resume";
import { calculateExperienceDuration } from "@/lib/date/duration";

export type { DetectedSection, SectionKey } from "@/lib/parser/section-detection";
export {
  detectResumeSections,
  detectSectionHeader,
  matchSectionHeader,
  splitResumeIntoSections,
} from "@/lib/parser/section-detection";

export function parseEducationSection(
  lines: string[],
  sourceResumeId: string,
  createId: () => string,
): ParsedEducationItem[] {
  const nonEmptyLines = lines.filter((line) => line.trim());
  if (nonEmptyLines.length === 0) {
    return [];
  }

  const { blocks, warnings } = parseEducationLines(nonEmptyLines);

  if (blocks.length > 0) {
    return blocks.map((block) => ({
      id: createId(),
      sourceResumeId,
      institution: block.institution,
      location: block.location || undefined,
      programmes: block.programmes,
      dateRange: block.dateRange || undefined,
      experienceDuration: block.dateRange
        ? calculateExperienceDuration(block.dateRange)
        : undefined,
      bullets: block.bullets,
      rawText: blockToRawText(block),
      parseWarnings: warnings,
    }));
  }

  return [
    {
      id: createId(),
      sourceResumeId,
      institution: "",
      programmes: [],
      bullets: [],
      rawText: nonEmptyLines.join("\n"),
      parseWarnings:
        warnings.length > 0
          ? warnings
          : ["Could not structure education entries; preserved raw text."],
    },
  ];
}

function splitSkillValues(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const BULLET_PREFIX_RE = /^[\s]*(?:[•●▪‣◦\-–—*►▸]|\d+[.)])\s*/;

function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_PREFIX_RE, "").trim();
}

function hasBulletPrefix(line: string): boolean {
  return BULLET_PREFIX_RE.test(line.trim());
}

/**
 * Parse a labeled skill line like "Programming: Python, SQL" or
 * "Soft skills: Communication, Teamwork" where the label is not one of the
 * three canonical labels (languages/technical/interests).
 * Returns the values if it looks like a labeled list, otherwise null.
 */
function parseLabeledSkillLine(line: string): string[] | null {
  const match = line.match(/^[A-Z][A-Za-z\s/&'-]{1,40}:\s*(.+)$/);
  if (!match) return null;
  return splitSkillValues(match[1]);
}

export function parseSkillsSection(
  lines: string[],
  sourceResumeId: string,
  createId: () => string,
): ParsedSkillsSection {
  const rawText = lines.join("\n").trim();
  const section: ParsedSkillsSection = {
    id: createId(),
    sourceResumeId,
    languages: [],
    technicalSkills: [],
    interests: [],
    other: [],
    rawText,
    parseWarnings: [],
  };

  let hasLabeledCategories = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Canonical labeled categories
    const languageMatch = trimmed.match(/^languages?\s*:\s*(.+)$/i);
    if (languageMatch) {
      section.languages.push(...splitSkillValues(languageMatch[1]));
      hasLabeledCategories = true;
      continue;
    }

    const technicalMatch = trimmed.match(/^technical\s+skills?\s*:\s*(.+)$/i);
    if (technicalMatch) {
      section.technicalSkills.push(...splitSkillValues(technicalMatch[1]));
      hasLabeledCategories = true;
      continue;
    }

    const interestsMatch = trimmed.match(/^interests?\s*:\s*(.+)$/i);
    if (interestsMatch) {
      section.interests.push(...splitSkillValues(interestsMatch[1]));
      hasLabeledCategories = true;
      continue;
    }

    // Other labeled categories (e.g. "Programming: Python, SQL") → technicalSkills
    const otherLabeled = parseLabeledSkillLine(trimmed);
    if (otherLabeled && otherLabeled.length > 0) {
      section.technicalSkills.push(...otherLabeled);
      hasLabeledCategories = true;
      continue;
    }

    // Bullet list items — strip prefix and add as individual other skills
    if (hasBulletPrefix(trimmed)) {
      const value = stripBulletPrefix(trimmed);
      if (value) {
        // If it contains commas, split further
        splitSkillValues(value).forEach((item) => section.other.push(item));
      }
      continue;
    }

    // Plain comma/semicolon separated line (e.g. "Python, SQL, React, Git")
    // Split and add each as an individual other item
    const commaParts = splitSkillValues(trimmed);
    if (commaParts.length >= 2) {
      section.other.push(...commaParts);
      continue;
    }

    // Single item line — add as-is
    section.other.push(trimmed);
  }

  if (rawText && !hasLabeledCategories && section.other.length === 0) {
    section.parseWarnings.push(
      "Skills section content could not be parsed; preserved as raw text.",
    );
  } else if (rawText && !hasLabeledCategories) {
    section.parseWarnings.push(
      "Skills section had no labeled categories (Languages/Technical Skills/Interests); items placed in general bucket.",
    );
  }

  return section;
}

export function parseAdditionalExperienceSection(
  lines: string[],
  sourceResumeId: string,
  createId: () => string,
  title = "Additional Experience",
): ParsedTextSection {
  const contentLines = lines.filter((line) => line.trim());
  return {
    id: createId(),
    sourceResumeId,
    title,
    lines: contentLines,
    rawText: contentLines.join("\n"),
    parseWarnings: [],
  };
}

export function emptyAdditionalExperience(
  sourceResumeId: string,
  createId: () => string,
): ParsedTextSection {
  return {
    id: createId(),
    sourceResumeId,
    title: "Additional Experience",
    lines: [],
    rawText: "",
    parseWarnings: [],
  };
}

export function emptySkillsSection(
  sourceResumeId: string,
  createId: () => string,
): ParsedSkillsSection {
  return {
    id: createId(),
    sourceResumeId,
    languages: [],
    technicalSkills: [],
    interests: [],
    other: [],
    rawText: "",
    parseWarnings: [],
  };
}

export function countSkillCategories(skills: ParsedSkillsSection): number {
  let count = 0;
  if (skills.languages.length > 0) count += 1;
  if (skills.technicalSkills.length > 0) count += 1;
  if (skills.interests.length > 0) count += 1;
  if (skills.other.length > 0) count += 1;
  return count;
}
