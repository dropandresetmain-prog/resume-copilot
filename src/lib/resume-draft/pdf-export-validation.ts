import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import {
  buildLayoutFixActionLabels,
  buildLayoutFixSuggestions,
} from "@/lib/resume-draft/layout-fix-suggestions";
import {
  formatOverflowAmount,
  type PdfFitMeasurement,
} from "@/lib/resume-draft/pdf-fit-measurement";

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
  contentHeightPx?: number;
  overflowPx?: number;
  overflowMm?: number;
};

export type BuildOnePagePdfValidationInput = {
  pageCount: number;
  fitMeasurement?: PdfFitMeasurement;
  layoutSettings?: ResumeLayoutSettings;
  hasAdditionalExperience?: boolean;
};

export function buildOnePagePdfValidation(
  pageCountOrInput: number | BuildOnePagePdfValidationInput,
): ResumePdfOnePageValidation {
  const input: BuildOnePagePdfValidationInput =
    typeof pageCountOrInput === "number" ? { pageCount: pageCountOrInput } : pageCountOrInput;
  const { pageCount, fitMeasurement, layoutSettings, hasAdditionalExperience } = input;

  if (pageCount <= 1) {
    return {
      pageCount,
      valid: true,
      contentHeightPx: fitMeasurement?.contentHeightPx,
      overflowPx: fitMeasurement?.overflowPx ?? 0,
      overflowMm: fitMeasurement?.overflowMm ?? 0,
    };
  }

  const overflowPx = fitMeasurement?.overflowPx ?? 0;
  const overflowMm = fitMeasurement?.overflowMm ?? 0;
  const overflowLabel =
    overflowPx > 0
      ? formatOverflowAmount({ overflowPx, overflowMm })
      : null;

  const suggestedActions =
    layoutSettings !== undefined
      ? buildLayoutFixActionLabels(
          buildLayoutFixSuggestions({
            layoutSettings,
            serverOverflowPx: overflowPx,
            serverPageCount: pageCount,
            hasAdditionalExperience,
          }),
        )
      : ONE_PAGE_PDF_REMEDIATION;

  const overflowDetail = overflowLabel
    ? ` Estimated overflow: ${overflowLabel} beyond one A4 page.`
    : "";

  return {
    pageCount,
    valid: false,
    message: `Server PDF is ${pageCount} pages.${overflowDetail} One page is required for export.`,
    suggestedActions,
    contentHeightPx: fitMeasurement?.contentHeightPx,
    overflowPx,
    overflowMm,
  };
}

export function buildOnePageExportBlockedFromValidation(validation: ResumePdfOnePageValidation) {
  return {
    error: validation.message ?? "PDF exceeds one page.",
    pageCount: validation.pageCount,
    message: validation.message,
    suggestedActions: validation.suggestedActions,
    contentHeightPx: validation.contentHeightPx,
    overflowPx: validation.overflowPx,
    overflowMm: validation.overflowMm,
  };
}

export function buildOnePageExportBlockedJson(
  pageCountOrInput: number | BuildOnePagePdfValidationInput,
) {
  const validation = buildOnePagePdfValidation(pageCountOrInput);
  return buildOnePageExportBlockedFromValidation(validation);
}
