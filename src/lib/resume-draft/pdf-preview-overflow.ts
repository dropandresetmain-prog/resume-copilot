import { RESUME_PDF_HTML_A4_MARKER } from "@/lib/resume-draft/resume-layout-styles";
import { A4_HEIGHT_MM, PX_TO_MM } from "@/lib/resume-draft/preview-settings";

/** One A4 page height in CSS pixels at 96dpi. */
export function a4PageHeightPx(): number {
  return A4_HEIGHT_MM / PX_TO_MM;
}

export type PdfPreviewOverflowMeasurement = {
  contentHeightPx: number;
  pageHeightPx: number;
  exceedsOnePage: boolean;
  overflowPx: number;
};

const DEFAULT_OVERFLOW_TOLERANCE_PX = 1;

/** Compare measured content height to one A4 page (ignores min-height inflation below one page). */
export function detectPdfPreviewPageOverflow(options: {
  contentHeightPx: number;
  pageHeightPx?: number;
  tolerancePx?: number;
}): PdfPreviewOverflowMeasurement {
  const pageHeightPx = options.pageHeightPx ?? a4PageHeightPx();
  const tolerancePx = options.tolerancePx ?? DEFAULT_OVERFLOW_TOLERANCE_PX;
  const overflowPx = Math.max(0, options.contentHeightPx - pageHeightPx);

  return {
    contentHeightPx: options.contentHeightPx,
    pageHeightPx,
    exceedsOnePage: overflowPx > tolerancePx,
    overflowPx,
  };
}

/** scrollHeight on the page marker includes padding and full content (min-height does not hide overflow). */
export function measureResumePdfPreviewContentHeightPx(pageElement: {
  scrollHeight: number;
}): number {
  return pageElement.scrollHeight;
}

export function measureResumePdfPreviewOverflow(
  doc: { querySelector(selector: string): { scrollHeight: number } | null },
  options?: { pageMarkerClass?: string; tolerancePx?: number },
): PdfPreviewOverflowMeasurement {
  const pageMarkerClass = options?.pageMarkerClass ?? RESUME_PDF_HTML_A4_MARKER;
  const pageEl = doc.querySelector(`.${pageMarkerClass}`);

  if (!pageEl) {
    return detectPdfPreviewPageOverflow({ contentHeightPx: a4PageHeightPx() });
  }

  return detectPdfPreviewPageOverflow({
    contentHeightPx: measureResumePdfPreviewContentHeightPx(pageEl),
    tolerancePx: options?.tolerancePx,
  });
}
