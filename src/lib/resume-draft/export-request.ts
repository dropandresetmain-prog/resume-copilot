import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
export { isApprovedDraftStatus } from "@/lib/resume-draft/draft-status";
import {
  clampPreviewBodyFontPx,
  PREVIEW_ITEM_LINE_SPACING_MAX,
  PREVIEW_ITEM_LINE_SPACING_MIN,
  PREVIEW_LINE_SPACING_MAX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MAX_MM,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_MAX_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_SECTION_SPACING_MAX,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";

export type ResumeExportRequestBody = {
  draftId?: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
};

export function parseResumeExportRequestBody(
  body: unknown,
): { draftId: string; layoutSettings?: Partial<ResumeLayoutSettings> } {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid export request body.");
  }

  const record = body as ResumeExportRequestBody;
  const draftId = record.draftId?.trim();
  if (!draftId) {
    throw new Error("draftId is required.");
  }

  return {
    draftId,
    layoutSettings: sanitizeLayoutSettings(record.layoutSettings),
  };
}

/** @deprecated Use parseResumeExportRequestBody */
export const parseResumeDocxExportRequestBody = parseResumeExportRequestBody;

export const parseResumePdfExportRequestBody = parseResumeExportRequestBody;

function sanitizeLayoutSettings(
  value: Partial<ResumeLayoutSettings> | undefined,
): Partial<ResumeLayoutSettings> | undefined {
  if (!value) {
    return undefined;
  }

  const next: Partial<ResumeLayoutSettings> = {};

  if (typeof value.bodyFontPx === "number") {
    next.bodyFontPx = clampPreviewBodyFontPx(value.bodyFontPx);
  }
  if (typeof value.marginMm === "number") {
    next.marginMm = Math.min(PREVIEW_MARGIN_MAX_MM, Math.max(PREVIEW_MARGIN_MIN_MM, value.marginMm));
  }
  if (typeof value.marginTopMm === "number") {
    next.marginTopMm = Math.min(
      PREVIEW_MARGIN_TOP_MAX_MM,
      Math.max(PREVIEW_MARGIN_TOP_MIN_MM, value.marginTopMm),
    );
  }
  if (typeof value.lineSpacing === "number") {
    next.lineSpacing = Math.min(
      PREVIEW_LINE_SPACING_MAX,
      Math.max(PREVIEW_LINE_SPACING_MIN, value.lineSpacing),
    );
  }
  if (typeof value.itemLineSpacing === "number") {
    next.itemLineSpacing = Math.min(
      PREVIEW_ITEM_LINE_SPACING_MAX,
      Math.max(PREVIEW_ITEM_LINE_SPACING_MIN, value.itemLineSpacing),
    );
  }
  if (typeof value.sectionSpacing === "number") {
    next.sectionSpacing = Math.min(
      PREVIEW_SECTION_SPACING_MAX,
      Math.max(PREVIEW_SECTION_SPACING_MIN, value.sectionSpacing),
    );
  }

  return Object.keys(next).length > 0 ? next : undefined;
}
