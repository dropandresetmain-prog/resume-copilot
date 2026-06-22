import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
import type { CompanyContext } from "@/types/company-context";
import type { StoredJobDescription } from "@/types/jd";

const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function sanitizeFileNamePart(value: string | undefined | null): string {
  if (!value) {
    return "";
  }

  return value
    .replace(CONTROL_CHARS, "")
    .replace(UNSAFE_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ResumeExportFileNameInput = {
  fullName?: string | null;
  companyName?: string | null;
  roleTitle?: string | null;
};

export function buildResumeExportFileNameInput(options: {
  fullName?: string | null;
  job?: Pick<StoredJobDescription, "companyName" | "roleTitle" | "jobUrl"> | null;
  companyContext?: Pick<CompanyContext, "displayName" | "website"> | null;
  targetRoleTitle?: string | null;
}): ResumeExportFileNameInput {
  const companyDisplay = formatCompanyNameForDisplay({
    rawName: options.job?.companyName,
    website: options.companyContext?.website ?? options.job?.jobUrl,
    savedDisplayName: options.companyContext?.displayName,
    fallback: "",
  });

  return {
    fullName: options.fullName?.trim() || undefined,
    companyName: companyDisplay || undefined,
    roleTitle: options.job?.roleTitle ?? options.targetRoleTitle ?? undefined,
  };
}

/** Shared stem: `<FULL NAME> - Resume_<COMPANY>_<ROLE>` or `<FULL NAME> - Resume` */
export function buildResumeExportFileStem(input: ResumeExportFileNameInput): string {
  const fullName = sanitizeFileNamePart(input.fullName) || "Resume";
  const company = sanitizeFileNamePart(input.companyName);
  const role = sanitizeFileNamePart(input.roleTitle);

  if (company && role) {
    return `${fullName} - Resume_${company}_${role}`;
  }

  return `${fullName} - Resume`;
}

/**
 * `<FULL NAME> - Resume_<COMPANY>_<ROLE>.docx` or `<FULL NAME> - Resume.docx`
 */
export function buildResumeDocxFileName(input: ResumeExportFileNameInput): string {
  return `${buildResumeExportFileStem(input)}.docx`;
}

/**
 * `<FULL NAME> - Resume_<COMPANY>_<ROLE>.pdf` or `<FULL NAME> - Resume.pdf`
 */
export function buildResumePdfFileName(input: ResumeExportFileNameInput): string {
  return `${buildResumeExportFileStem(input)}.pdf`;
}

export function buildCoverLetterExportFileStem(input: ResumeExportFileNameInput): string {
  const fullName = sanitizeFileNamePart(input.fullName) || "Cover Letter";
  const company = sanitizeFileNamePart(input.companyName);
  const role = sanitizeFileNamePart(input.roleTitle);

  if (company && role) {
    return `${fullName} - Cover Letter_${company}_${role}`;
  }

  return `${fullName} - Cover Letter`;
}

export function buildCoverLetterDocxFileName(input: ResumeExportFileNameInput): string {
  return `${buildCoverLetterExportFileStem(input)}.docx`;
}

export function buildCoverLetterPdfFileName(input: ResumeExportFileNameInput): string {
  return `${buildCoverLetterExportFileStem(input)}.pdf`;
}

export function buildResumeDocxStoragePath(
  userId: string,
  draftId: string,
  fileName: string,
): string {
  const safeName = sanitizeFileNamePart(fileName.replace(/\.docx$/i, "")) || "Resume";
  return `${userId}/resumes/${draftId}/${safeName}.docx`;
}

export function buildResumePdfStoragePath(
  userId: string,
  draftId: string,
  fileName: string,
): string {
  const safeName = sanitizeFileNamePart(fileName.replace(/\.pdf$/i, "")) || "Resume";
  return `${userId}/resumes/${draftId}/${safeName}.pdf`;
}
