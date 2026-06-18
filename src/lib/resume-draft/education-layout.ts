import type { ResumeDraftEducationItem } from "@/types/resume-draft";

export type EducationDegreeLine = {
  text: string;
  dateRange?: string;
};

export type NormalizedEducationLayout = {
  institutionLine: string;
  location?: string;
  degreeLines: EducationDegreeLine[];
};

const DEGREE_PATTERN =
  /\b(bachelor|master|b\.?\s?eng\.?|m\.?\s?sc\.?|ph\.?\s?d\.?|doctorate|doctor|bsc|msc|mba|b\.?\s?a\.?|m\.?\s?a\.?|associate|diploma|honours|honors)\b/i;

const SPECIAL_PROGRAMME_PATTERN =
  /\b(programme|program|rep\b|scholar|study abroad|accelerated|cohort|premier)\b/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripInstitutionFromProgramme(programme: string, institution: string): string {
  let text = normalizeWhitespace(programme);
  const inst = normalizeWhitespace(institution);
  if (!inst || !text) {
    return text;
  }

  if (text.toLowerCase() === inst.toLowerCase()) {
    return "";
  }

  const prefixPattern = new RegExp(`^${escapeRegex(inst)}\\s*[,·|\\-–—]\\s*`, "i");
  text = text.replace(prefixPattern, "").trim();

  const doubledInstitution = new RegExp(
    `^${escapeRegex(inst)}\\s+${escapeRegex(inst)}\\b`,
    "i",
  );
  text = text.replace(doubledInstitution, inst).trim();

  if (text.toLowerCase() === inst.toLowerCase()) {
    return "";
  }

  return text;
}

function dedupeInstitutionInLine(line: string, institution: string): string {
  const inst = normalizeWhitespace(institution);
  let result = normalizeWhitespace(line);

  const duplicateAfterComma = new RegExp(
    `^(${escapeRegex(inst)})\\s*,\\s*\\1(?:\\s*,|\\s*$)`,
    "i",
  );
  while (duplicateAfterComma.test(result)) {
    result = result.replace(duplicateAfterComma, "$1,");
  }

  result = result.replace(new RegExp(`^(${escapeRegex(inst)})\\s*,\\s*\\1\\s*$`, "i"), "$1");

  return normalizeWhitespace(result.replace(/,\s*,/g, ","));
}

function isDegreeLine(text: string): boolean {
  return DEGREE_PATTERN.test(text);
}

function isSpecialProgrammeLine(text: string): boolean {
  if (isDegreeLine(text)) {
    return false;
  }
  return SPECIAL_PROGRAMME_PATTERN.test(text);
}

/**
 * Render-time education normalization — does not mutate stored draft content.
 *
 * Produces:
 * - One bold institution line (institution + special programme, comma-separated)
 * - Italic degree lines (no repeated institution; date range on first degree only)
 */
export function normalizeEducationForLayout(
  item: ResumeDraftEducationItem,
): NormalizedEducationLayout {
  const institution = normalizeWhitespace(item.institution);
  const location = item.location?.trim() || undefined;
  const sharedDateRange = item.dateRange?.trim() || undefined;

  const cleanedProgrammes = item.programmes
    .map((programme) => stripInstitutionFromProgramme(programme, institution))
    .map(normalizeWhitespace)
    .filter(Boolean);

  const specialProgrammes: string[] = [];
  const degrees: string[] = [];

  for (const programme of cleanedProgrammes) {
    if (isDegreeLine(programme)) {
      degrees.push(programme);
    } else if (isSpecialProgrammeLine(programme)) {
      specialProgrammes.push(programme);
    } else if (programme.includes(",") && programme.length > 40) {
      degrees.push(programme);
    } else if (/\([^)]+\)/.test(programme)) {
      degrees.push(programme);
    } else {
      specialProgrammes.push(programme);
    }
  }

  if (degrees.length === 0 && cleanedProgrammes.length > 0) {
    degrees.push(...cleanedProgrammes.filter((programme) => !specialProgrammes.includes(programme)));
    if (degrees.length === 0) {
      degrees.push(...cleanedProgrammes);
    }
  }

  const institutionLower = institution.toLowerCase();
  const filteredSpecials = specialProgrammes.filter((programme) => {
    const lower = programme.toLowerCase();
    return lower !== institutionLower && !institutionLower.includes(lower);
  });

  let institutionLine = institution;
  if (filteredSpecials.length > 0) {
    institutionLine = `${institution}, ${filteredSpecials.join(", ")}`;
  }
  institutionLine = dedupeInstitutionInLine(institutionLine, institution);

  const degreeLines: EducationDegreeLine[] = degrees.map((text, index) => ({
    text,
    dateRange: index === 0 ? sharedDateRange : undefined,
  }));

  return {
    institutionLine,
    location,
    degreeLines,
  };
}
