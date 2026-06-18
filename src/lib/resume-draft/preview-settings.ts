/** Default resume font stack — Gill Sans MT preferred for reference/export parity. */
export const DEFAULT_RESUME_FONT_FAMILY =
  '"Gill Sans MT", Calibri, Aptos, Arial, Helvetica, sans-serif';

/** Body font size slider — 0.5px steps. */
export const PREVIEW_BODY_FONT_MIN_PX = 7;
export const PREVIEW_BODY_FONT_MAX_PX = 12;
export const PREVIEW_BODY_FONT_DEFAULT_PX = 11;
export const PREVIEW_BODY_FONT_STEP_PX = 0.5;

export const PREVIEW_MARGIN_MIN_MM = 8;
export const PREVIEW_MARGIN_MAX_MM = 24;
export const PREVIEW_MARGIN_DEFAULT_MM = 12;

/** Top margin defaults tighter than sides for compact header placement. */
export const PREVIEW_MARGIN_TOP_MIN_MM = 6;
export const PREVIEW_MARGIN_TOP_MAX_MM = 20;
export const PREVIEW_MARGIN_TOP_DEFAULT_MM = 9;

export const PREVIEW_LINE_SPACING_MIN = 1;
export const PREVIEW_LINE_SPACING_MAX = 1.4;
export const PREVIEW_LINE_SPACING_DEFAULT = 1.05;

export const PREVIEW_SECTION_SPACING_MIN = 0.35;
export const PREVIEW_SECTION_SPACING_MAX = 1.6;
export const PREVIEW_SECTION_SPACING_DEFAULT = 0.6;

export const A4_HEIGHT_MM = 297;
export const A4_WIDTH_MM = 210;

/** CSS px to mm at 96dpi. */
export const PX_TO_MM = 0.264583;

export type PreviewFontSizes = {
  bodyPx: number;
  headerPx: number;
  sectionPx: number;
};

/** Header and section titles are one step above body (same step size as slider). */
export function resolvePreviewFontSizes(bodyFontPx: number): PreviewFontSizes {
  const step = PREVIEW_BODY_FONT_STEP_PX;
  const sectionPx = bodyFontPx + step;
  return {
    bodyPx: bodyFontPx,
    headerPx: sectionPx,
    sectionPx,
  };
}

/** Candidate name matches section header size (body + one step). */
export function resolveCandidateNameFontPx(bodyFontPx: number): number {
  return resolvePreviewFontSizes(bodyFontPx).sectionPx;
}

export function clampPreviewBodyFontPx(value: number): number {
  const clamped = Math.min(PREVIEW_BODY_FONT_MAX_PX, Math.max(PREVIEW_BODY_FONT_MIN_PX, value));
  const steps = Math.round((clamped - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX);
  return PREVIEW_BODY_FONT_MIN_PX + steps * PREVIEW_BODY_FONT_STEP_PX;
}

export function computeMaxLinesOnePage(options: {
  marginMm: number;
  marginTopMm: number;
  bodyFontPx: number;
  lineSpacing: number;
}): number {
  const contentHeightMm =
    A4_HEIGHT_MM - options.marginTopMm - options.marginMm;
  const lineHeightMm = options.bodyFontPx * options.lineSpacing * PX_TO_MM;
  if (lineHeightMm <= 0) return 1;
  return Math.max(1, Math.floor(contentHeightMm / lineHeightMm));
}
