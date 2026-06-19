import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import {
  clampPreviewBodyFontPx,
  PREVIEW_LINE_SPACING_MAX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MAX_MM,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_MAX_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_SECTION_SPACING_MAX,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";
import type { ResumeDraftExportLayoutSettings } from "@/types/resume-draft";

export function areExportLayoutSettingsEqual(
  stored: ResumeDraftExportLayoutSettings | undefined,
  current: Partial<ResumeLayoutSettings> | ResumeDraftExportLayoutSettings,
): boolean {
  const sanitized = sanitizeExportLayoutSettings(current);
  if (!stored || !sanitized) {
    return false;
  }

  return (
    stored.bodyFontPx === sanitized.bodyFontPx &&
    stored.marginMm === sanitized.marginMm &&
    stored.marginTopMm === sanitized.marginTopMm &&
    stored.lineSpacing === sanitized.lineSpacing &&
    stored.sectionSpacing === sanitized.sectionSpacing
  );
}

export function sanitizeExportLayoutSettings(
  value: Partial<ResumeLayoutSettings> | ResumeDraftExportLayoutSettings | undefined,
): ResumeDraftExportLayoutSettings | undefined {
  if (!value) {
    return undefined;
  }

  const next: Partial<ResumeDraftExportLayoutSettings> = {};

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
  if (typeof value.sectionSpacing === "number") {
    next.sectionSpacing = Math.min(
      PREVIEW_SECTION_SPACING_MAX,
      Math.max(PREVIEW_SECTION_SPACING_MIN, value.sectionSpacing),
    );
  }

  if (
    typeof next.bodyFontPx !== "number" ||
    typeof next.marginMm !== "number" ||
    typeof next.marginTopMm !== "number" ||
    typeof next.lineSpacing !== "number" ||
    typeof next.sectionSpacing !== "number"
  ) {
    return undefined;
  }

  return {
    bodyFontPx: next.bodyFontPx,
    marginMm: next.marginMm,
    marginTopMm: next.marginTopMm,
    lineSpacing: next.lineSpacing,
    sectionSpacing: next.sectionSpacing,
  };
}

export function parseStoredExportLayoutSettings(
  value: unknown,
): ResumeDraftExportLayoutSettings | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return sanitizeExportLayoutSettings(value as Partial<ResumeLayoutSettings>);
}
