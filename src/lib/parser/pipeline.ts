/**
 * Resume parsing pipeline — layers section detection, generic extraction,
 * format-specific profiles, and unparsed fallbacks.
 */

import { calculateExperienceDuration } from "@/lib/date/duration";
import {
  isLowConfidence,
  parseExperienceSection,
} from "@/lib/parser/experience-parser";
import type { ParsedExperienceBlock } from "@/lib/parser/heuristics";
import {
  isConfidentProfileContact,
  parseProfileContact,
} from "@/lib/parser/profile-contact";
import {
  detectResumeSections,
  type DetectedSection,
} from "@/lib/parser/section-detection";
import {
  emptyAdditionalExperience,
  emptySkillsSection,
  parseAdditionalExperienceSection,
  parseEducationSection,
  parseSkillsSection,
} from "@/lib/parser/sections";
import type {
  ParsedEducationItem,
  ParsedExperience,
  ParsedProfileContact,
  ParsedResume,
  ParsedSkillsSection,
  ParsedTextSection,
  ParsedUnparsedSection,
} from "@/types/resume";

type CreateId = () => string;

function createUnparsedSection(
  title: string,
  lines: string[],
  sourceResumeId: string,
  createId: CreateId,
  parseWarnings: string[],
  originalHeader?: string,
): ParsedUnparsedSection {
  const contentLines = lines.filter((line) => line.trim());
  return {
    id: createId(),
    sourceResumeId,
    title,
    originalHeader: originalHeader ?? title,
    lines: contentLines,
    rawText: contentLines.join("\n"),
    parseWarnings,
  };
}

function blocksToWorkExperiences(
  blocks: ParsedExperienceBlock[],
  sourceResumeId: string,
  createId: CreateId,
): ParsedExperience[] {
  return blocks.map((block) => {
    const experienceId = createId();
    return {
      id: experienceId,
      sourceResumeId,
      company: block.company,
      descriptor: block.descriptor,
      location: block.location,
      role: block.role,
      dateRange: block.dateRange,
      experienceDuration: calculateExperienceDuration(block.dateRange),
      rawHeader: block.rawHeader,
      rawRoleLine: block.rawRoleLine,
      bullets: block.bullets.map((bullet) => ({
        id: createId(),
        parentId: experienceId,
        keyword: bullet.keyword,
        description: bullet.description,
        rawBulletText: bullet.rawBulletText,
      })),
    };
  });
}

function appendUnparsedFromSection(
  unparsedSections: ParsedUnparsedSection[],
  section: DetectedSection,
  sourceResumeId: string,
  createId: CreateId,
  parseWarnings: string[],
): void {
  if (section.key === "unparsed") {
    unparsedSections.push(
      createUnparsedSection(
        section.title,
        section.lines,
        sourceResumeId,
        createId,
        [
          "Section header was not mapped to a known section type.",
          ...parseWarnings,
        ],
        section.originalHeader,
      ),
    );
    return;
  }

  if (section.lines.some((line) => line.trim())) {
    unparsedSections.push(
      createUnparsedSection(
        `${section.title} (needs review)`,
        section.lines,
        sourceResumeId,
        createId,
        parseWarnings,
        section.originalHeader,
      ),
    );
  }
}

function parseWorkExperienceFromLines(
  lines: string[],
  section: Pick<DetectedSection, "title" | "originalHeader" | "rawText"> | null,
  sourceResumeId: string,
  createId: CreateId,
  parseWarnings: string[],
  unparsedSections: ParsedUnparsedSection[],
): ParsedExperience[] {
  const result = parseExperienceSection(lines);
  parseWarnings.push(...result.warnings);

  if (result.blocks.length === 0) {
    parseWarnings.push(
      section
        ? `Could not structure "${section.title}"; preserved as unparsed text.`
        : "Could not structure work experience; preserved as unparsed text.",
    );

    if (lines.some((line) => line.trim())) {
      unparsedSections.push(
        createUnparsedSection(
          section?.title ?? "Work Experience (needs review)",
          lines,
          sourceResumeId,
          createId,
          [
            "No work experience blocks were extracted.",
            ...result.warnings,
          ],
          section?.originalHeader,
        ),
      );
    }

    return [];
  }

  if (isLowConfidence(result.confidence)) {
    parseWarnings.push(
      `Work experience parsed with low confidence using profile "${result.profileName}" (score ${result.score.toFixed(2)}).`,
    );
    appendUnparsedFromSection(
      unparsedSections,
      {
        key: "work_experience",
        title: section?.title ?? "Work Experience",
        originalHeader: section?.originalHeader ?? "Work Experience",
        lines,
        rawText: section?.rawText ?? lines.join("\n").trim(),
      },
      sourceResumeId,
      createId,
      [
        "Structured work experience may be unreliable for this format.",
        ...result.warnings,
      ],
    );
  } else if (result.unconsumedLines.length > 0) {
    parseWarnings.push(
      `${result.unconsumedLines.length} work experience line(s) were not consumed by the active parser profile.`,
    );
    unparsedSections.push(
      createUnparsedSection(
        `${section?.title ?? "Work Experience"} (unparsed lines)`,
        result.unconsumedLines,
        sourceResumeId,
        createId,
        ["These lines were not matched by the active experience parser profile."],
        section?.originalHeader,
      ),
    );
  }

  return blocksToWorkExperiences(result.blocks, sourceResumeId, createId);
}

function educationNeedsReview(items: ParsedEducationItem[]): boolean {
  if (items.length === 0) return true;

  const hasStructure = items.some(
    (item) => item.institution.trim() || item.programmes.length > 0,
  );
  if (!hasStructure) return true;

  return items.some((item) => item.parseWarnings.length > 0);
}

function applyProfileContactParsing(
  preambleLines: string[],
  parseWarnings: string[],
  unparsedSections: ParsedUnparsedSection[],
  resumeId: string,
  createId: CreateId,
): ParsedProfileContact | undefined {
  const profile = parseProfileContact(preambleLines);
  if (!isConfidentProfileContact(profile)) {
    if (preambleLines.length > 0) {
      unparsedSections.push(
        createUnparsedSection(
          "Document preamble",
          preambleLines,
          resumeId,
          createId,
          ["Content appeared before the first detected section header."],
        ),
      );
      parseWarnings.push("Content found before the first section header.");
    }
    return undefined;
  }

  parseWarnings.push(...profile.parseWarnings);
  return profile;
}

export function parseResumeContent(
  text: string,
  resumeId: string,
  createId: CreateId,
): Omit<ParsedResume, "id" | "filename" | "uploadedAt"> {
  const parseWarnings: string[] = [];
  const unparsedSections: ParsedUnparsedSection[] = [];
  const { sections, preambleLines } = detectResumeSections(text);

  let workExperiences: ParsedExperience[] = [];
  let educationItems: ParsedEducationItem[] = [];
  let additionalExperience: ParsedTextSection = emptyAdditionalExperience(
    resumeId,
    createId,
  );
  let skills: ParsedSkillsSection = emptySkillsSection(resumeId, createId);
  const profile = applyProfileContactParsing(
    preambleLines,
    parseWarnings,
    unparsedSections,
    resumeId,
    createId,
  );

  if (sections.length === 0) {
    parseWarnings.push(
      "No section headers detected; attempting work experience parse on full document.",
    );
    const allLines = text.split(/\r?\n/);
    workExperiences = parseWorkExperienceFromLines(
      allLines,
      null,
      resumeId,
      createId,
      parseWarnings,
      unparsedSections,
    );

    if (workExperiences.length === 0 && text.trim()) {
      unparsedSections.push(
        createUnparsedSection(
          "Full document (needs review)",
          allLines,
          resumeId,
          createId,
          ["No section headers or experience structure were detected."],
        ),
      );
    }

    return {
      profile,
      workExperiences,
      education: educationItems,
      additionalExperience,
      skills,
      unparsedSections,
      parseWarnings,
    };
  }

  for (const section of sections) {
    switch (section.key) {
      case "work_experience":
        workExperiences = parseWorkExperienceFromLines(
          section.lines,
          section,
          resumeId,
          createId,
          parseWarnings,
          unparsedSections,
        );
        break;
      case "education": {
        educationItems = parseEducationSection(section.lines, resumeId, createId);
        for (const item of educationItems) {
          parseWarnings.push(...item.parseWarnings);
        }
        if (educationNeedsReview(educationItems)) {
          appendUnparsedFromSection(
            unparsedSections,
            section,
            resumeId,
            createId,
            ["Education structure may be incomplete for this format."],
          );
        }
        break;
      }
      case "additional_experience":
        additionalExperience = parseAdditionalExperienceSection(
          section.lines,
          resumeId,
          createId,
          section.title,
        );
        break;
      case "skills":
        skills = parseSkillsSection(section.lines, resumeId, createId);
        break;
      case "unparsed":
        unparsedSections.push(
          createUnparsedSection(
            section.title,
            section.lines,
            resumeId,
            createId,
            ["Unknown section type — preserved for manual review."],
            section.originalHeader,
          ),
        );
        parseWarnings.push(`Unknown section "${section.originalHeader}" preserved as unparsed.`);
        break;
      default:
        parseWarnings.push(`Unhandled section: ${section.title}`);
    }
  }

  return {
    profile,
    workExperiences,
    education: educationItems,
    additionalExperience,
    skills,
    unparsedSections,
    parseWarnings,
  };
}
