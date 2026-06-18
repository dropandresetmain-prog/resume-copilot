import type { JobDescriptionInput } from "@/types/jd";

const ROLE_LABEL_PATTERN = /^(?:job\s*title|position|role)\s*[:|-]\s*(.+)$/i;
const COMPANY_LABEL_PATTERN = /^(?:company|employer|organization)\s*[:|-]\s*(.+)$/i;
const AT_COMPANY_PATTERN = /\bat\s+([A-Z][\w\s&.'-]+(?:Inc|Corp|LLC|Ltd|Co\.?)?)\b/;
const HIRING_COMPANY_PATTERN = /^([A-Z][\w\s&.'-]{2,60})\s+(?:is hiring|seeks|looking for)/i;

export type ExtractedJobMetadata = {
  companyName?: string;
  roleTitle?: string;
};

function cleanValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function looksLikeRoleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 100) return false;
  if (COMPANY_LABEL_PATTERN.test(trimmed)) return false;
  if (HIRING_COMPANY_PATTERN.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

/**
 * Lightweight heuristics for company/role when fields are blank.
 * Does not call AI.
 */
export function extractJobMetadataFromText(rawText: string): ExtractedJobMetadata {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  let companyName: string | undefined;
  let roleTitle: string | undefined;

  for (const line of lines) {
    const roleLabel = line.match(ROLE_LABEL_PATTERN);
    if (roleLabel) {
      roleTitle = roleTitle ?? cleanValue(roleLabel[1]);
      continue;
    }

    const companyLabel = line.match(COMPANY_LABEL_PATTERN);
    if (companyLabel) {
      companyName = companyName ?? cleanValue(companyLabel[1]);
      continue;
    }

    const hiringMatch = line.match(HIRING_COMPANY_PATTERN);
    if (hiringMatch) {
      companyName = companyName ?? cleanValue(hiringMatch[1]);
    }

    const atCompany = line.match(AT_COMPANY_PATTERN);
    if (atCompany) {
      companyName = companyName ?? cleanValue(atCompany[1]);
    }
  }

  if (!roleTitle) {
    const firstUseful = lines.find((line) => looksLikeRoleLine(line));
    if (firstUseful && firstUseful.length <= 80) {
      roleTitle = cleanValue(firstUseful);
    }
  }

  if (!companyName && roleTitle && lines[1]) {
    const secondLine = lines[1];
    if (
      secondLine.length <= 80 &&
      /[A-Za-z]/.test(secondLine) &&
      secondLine.toLowerCase() !== roleTitle.toLowerCase()
    ) {
      companyName = cleanValue(secondLine);
    }
  }

  return {
    companyName,
    roleTitle,
  };
}

/** Fill only blank metadata fields; never overwrite user-provided values. */
export function mergeExtractedJobMetadata(
  current: JobDescriptionInput,
  extracted: ExtractedJobMetadata,
): JobDescriptionInput {
  return {
    ...current,
    companyName: current.companyName?.trim()
      ? current.companyName
      : extracted.companyName ?? current.companyName,
    roleTitle: current.roleTitle?.trim()
      ? current.roleTitle
      : extracted.roleTitle ?? current.roleTitle,
  };
}
