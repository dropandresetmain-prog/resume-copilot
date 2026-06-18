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
