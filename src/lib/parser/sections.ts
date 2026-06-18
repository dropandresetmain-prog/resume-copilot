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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const languageMatch = trimmed.match(/^languages?\s*:\s*(.+)$/i);
    if (languageMatch) {
      section.languages.push(...splitSkillValues(languageMatch[1]));
      continue;
    }

    const technicalMatch = trimmed.match(/^technical\s+skills?\s*:\s*(.+)$/i);
    if (technicalMatch) {
      section.technicalSkills.push(...splitSkillValues(technicalMatch[1]));
      continue;
    }

    const interestsMatch = trimmed.match(/^interests?\s*:\s*(.+)$/i);
    if (interestsMatch) {
      section.interests.push(...splitSkillValues(interestsMatch[1]));
      continue;
    }

    section.other.push(trimmed);
  }

  if (rawText && section.languages.length === 0 && section.technicalSkills.length === 0) {
    section.parseWarnings.push(
      "Skills section preserved as raw text; labeled categories were not detected.",
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
