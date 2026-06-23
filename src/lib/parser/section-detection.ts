/**
 * Layer 1 — generic resume section detection.
 *
 * Maps common header aliases to canonical section keys. Unrecognized headers
 * are preserved under `unparsed` so text is never discarded.
 */

import { looksLikePersonNameHeader } from "@/lib/parser/profile-contact";

export type SectionKey =
  | "work_experience"
  | "education"
  | "additional_experience"
  | "skills"
  | "unparsed";

export type SectionDefinition = {
  key: Exclude<SectionKey, "unparsed">;
  canonicalTitle: string;
  aliases: RegExp[];
};

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "work_experience",
    canonicalTitle: "Work Experience",
    aliases: [
      /^work\s+experience$/i,
      /^professional\s+experience$/i,
      /^professional\s+history$/i,
      /^experience$/i,
      /^employment$/i,
      /^employment\s+history$/i,
      /^work\s+history$/i,
      /^career(\s+history)?$/i,
    ],
  },
  {
    key: "education",
    canonicalTitle: "Education",
    aliases: [
      /^education$/i,
      /^academic\s+background$/i,
      /^academic\s+history$/i,
      /^qualifications?$/i,
      /^education\s*(?:&|and)\s*training$/i,
    ],
  },
  {
    key: "additional_experience",
    canonicalTitle: "Additional Experience",
    aliases: [
      /^additional\s+experience$/i,
      /^other\s+experience$/i,
      /^projects?$/i,
      /^personal\s+projects?$/i,
      /^side\s+projects?$/i,
      /^leadership$/i,
      /^volunteering$/i,
      /^volunteer(\s+experience)?$/i,
      /^extracurricular(\s+activities)?$/i,
      /^certifications?$/i,
      /^certificates?$/i,
      /^achievements?$/i,
      /^awards?$/i,
      /^honours?$/i,
      /^honors?$/i,
      /^activities$/i,
      /^publications?$/i,
    ],
  },
  {
    key: "skills",
    canonicalTitle: "Skills & Interest",
    aliases: [
      /^skills?$/i,
      /^skills?\s*(?:&|and)\s*interests?$/i,
      /^technical\s+skills?$/i,
      /^core\s+competenc(?:y|ies)$/i,
      /^competenc(?:y|ies)$/i,
      /^key\s+skills?$/i,
      /^skill\s+set$/i,
      /^areas?\s+of\s+expertise$/i,
      /^expertise$/i,
      /^tools?\s*(?:&|and)\s*technologies?$/i,
      /^technologies?$/i,
    ],
  },
];

export type DetectedSection = {
  key: SectionKey;
  title: string;
  originalHeader: string;
  lines: string[];
  rawText: string;
};

export type SectionDetectionResult = {
  sections: DetectedSection[];
  preambleLines: string[];
};

function normalizeHeaderLine(line: string): string {
  return line.trim().replace(/:$/, "").trim();
}

/** Common title-case / mixed-case headers preserved as unparsed sections. */
const UNPARSED_SECTION_ALIASES: RegExp[] = [
  /^summary$/i,
  /^professional\s+summary$/i,
  /^profile$/i,
  /^objective$/i,
  /^references?$/i,
];

function matchesUnparsedSectionAlias(line: string): boolean {
  const normalized = normalizeHeaderLine(line);
  return UNPARSED_SECTION_ALIASES.some((pattern) => pattern.test(normalized));
}

export function matchSectionHeader(line: string): {
  key: SectionKey;
  canonicalTitle: string;
  originalHeader: string;
} | null {
  const originalHeader = line.trim();
  const normalized = normalizeHeaderLine(originalHeader);
  if (!normalized) return null;

  for (const definition of SECTION_DEFINITIONS) {
    for (const pattern of definition.aliases) {
      if (pattern.test(normalized)) {
        return {
          key: definition.key,
          canonicalTitle: definition.canonicalTitle,
          originalHeader,
        };
      }
    }
  }

  if (matchesUnparsedSectionAlias(normalized)) {
    return {
      key: "unparsed",
      canonicalTitle: normalized,
      originalHeader,
    };
  }

  if (looksLikeUnknownSectionHeader(normalized)) {
    return {
      key: "unparsed",
      canonicalTitle: normalized,
      originalHeader,
    };
  }

  return null;
}

export function looksLikeUnknownSectionHeader(line: string): boolean {
  if (looksLikePersonNameHeader(line)) return false;

  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 80) return false;
  if (parseBulletLikeHeader(trimmed)) return false;

  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return false;

  const uppercaseLetters = letters.match(/[A-Z]/g)?.length ?? 0;
  const uppercaseRatio = uppercaseLetters / letters.length;

  if (uppercaseRatio >= 0.85 && /[A-Z]{2,}/.test(trimmed)) {
    return true;
  }

  return false;
}

export { looksLikePersonNameHeader };

function parseBulletLikeHeader(line: string): boolean {
  return /^[\s]*(?:[•●▪‣◦\-–—*►▸]|\d+[.)])/.test(line);
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "    ").trimEnd());
}

function finalizeSection(section: DetectedSection): DetectedSection {
  return {
    ...section,
    rawText: section.lines.join("\n").trim(),
  };
}

export function detectResumeSections(text: string): SectionDetectionResult {
  const lines = normalizeLines(text);
  const sections: DetectedSection[] = [];
  const preambleLines: string[] = [];
  let current: DetectedSection | null = null;

  for (const line of lines) {
    const header = matchSectionHeader(line);

    if (header) {
      if (current) {
        sections.push(finalizeSection(current));
      }

      current = {
        key: header.key,
        title: header.canonicalTitle,
        originalHeader: header.originalHeader,
        lines: [],
        rawText: "",
      };
      continue;
    }

    if (!current) {
      if (line.trim()) {
        preambleLines.push(line);
      }
      continue;
    }

    current.lines.push(line);
  }

  if (current) {
    sections.push(finalizeSection(current));
  }

  return { sections, preambleLines };
}

/** @deprecated Use detectResumeSections or matchSectionHeader. */
export function detectSectionHeader(line: string): SectionKey | null {
  const match = matchSectionHeader(line);
  if (!match) return null;
  return match.key === "unparsed" ? null : match.key;
}

/** @deprecated Use detectResumeSections. */
export function splitResumeIntoSections(text: string): DetectedSection[] {
  return detectResumeSections(text).sections;
}
