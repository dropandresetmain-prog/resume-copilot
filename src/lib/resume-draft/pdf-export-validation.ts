export const ONE_PAGE_PDF_REMEDIATION = [
  "Tighten layout controls (font size, margins, line spacing, section spacing).",
  "Reduce bullet count or shorten bullet text in Edit Resume Details.",
  "Remove lower-priority roles or bullets if content is too long.",
  "Click Re-approve for Export after changes.",
] as const;

export type ResumePdfOnePageValidation = {
  pageCount: number;
  valid: boolean;
  message?: string;
  suggestedActions?: readonly string[];
};

export function buildOnePagePdfValidation(pageCount: number): ResumePdfOnePageValidation {
  if (pageCount <= 1) {
    return {
      pageCount,
      valid: true,
    };
  }

  return {
    pageCount,
    valid: false,
    message: `Server PDF is ${pageCount} pages. One page is required for export.`,
    suggestedActions: ONE_PAGE_PDF_REMEDIATION,
  };
}

export function buildOnePageExportBlockedJson(pageCount: number) {
  const validation = buildOnePagePdfValidation(pageCount);
  return {
    error: validation.message ?? "PDF exceeds one page.",
    pageCount: validation.pageCount,
    message: validation.message,
    suggestedActions: validation.suggestedActions,
  };
}
