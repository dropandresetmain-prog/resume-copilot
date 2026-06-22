/** Preferred resume font for preview/export when reference detection is unavailable. */
export const PREFERRED_RESUME_DOCX_FONT = "Gill Sans MT";

export const DEFAULT_RESUME_FONT_STACK = `${PREFERRED_RESUME_DOCX_FONT}, Calibri, Aptos, Arial, Helvetica, sans-serif`;

/** Minimum DOCX body size — preview defaults map here, not below unless user opts in later. */
export const DOCX_BODY_FONT_MIN_PT = 10;

const PREVIEW_BODY_PX_TO_DOCX_PT: Record<number, number> = {
  12.5: 11,
  12: 10.5,
  11.5: 10.5,
  11: 10,
  10.5: 10,
  10: 9.5,
  9.5: 9.5,
  9: 9,
  8.5: 8.5,
};

export function resolveDocxFontFamily(fontFamily?: string): string {
  const primary = fontFamily?.split(",")[0]?.replace(/['"]/g, "").trim();
  if (primary && !/^serif$/i.test(primary)) {
    return primary;
  }
  return PREFERRED_RESUME_DOCX_FONT;
}

/** Map preview body px to Word point size (not naive css-px→pt). */
export function mapPreviewBodyPxToDocxPt(bodyFontPx: number): number {
  const snapped = Math.round(bodyFontPx * 2) / 2;
  const mapped = PREVIEW_BODY_PX_TO_DOCX_PT[snapped] ?? bodyFontPx * 0.91;
  return Math.max(DOCX_BODY_FONT_MIN_PT, Math.round(mapped * 2) / 2);
}

export function mapPreviewBodyPxToDocxHalfPoints(bodyFontPx: number): number {
  return Math.round(mapPreviewBodyPxToDocxPt(bodyFontPx) * 2);
}

/** Name/section headers: body + 1pt in DOCX terms. */
export function mapPreviewHeaderPxToDocxHalfPoints(bodyFontPx: number): number {
  const bodyPt = mapPreviewBodyPxToDocxPt(bodyFontPx);
  return Math.round((bodyPt + 1) * 2);
}

export type DocxFontSizes = {
  bodyHalfPoints: number;
  headerHalfPoints: number;
  bodyPt: number;
  headerPt: number;
  font: string;
};

export function resolveDocxFontSizes(
  bodyFontPx: number,
  fontFamily?: string,
): DocxFontSizes {
  const bodyPt = mapPreviewBodyPxToDocxPt(bodyFontPx);
  const headerPt = bodyPt + 1;
  return {
    bodyPt,
    headerPt,
    bodyHalfPoints: Math.round(bodyPt * 2),
    headerHalfPoints: Math.round(headerPt * 2),
    font: resolveDocxFontFamily(fontFamily),
  };
}
