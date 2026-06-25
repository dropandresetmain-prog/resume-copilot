import { detectPdfPreviewPageOverflow, a4PageHeightPx } from "@/lib/resume-draft/pdf-preview-overflow";
import { RESUME_PDF_HTML_A4_MARKER } from "@/lib/resume-draft/resume-layout-styles";
import { A4_HEIGHT_MM, PX_TO_MM } from "@/lib/resume-draft/preview-settings";

export type PdfFitMeasurement = {
  contentHeightPx: number;
  pageHeightPx: number;
  overflowPx: number;
  overflowMm: number;
  exceedsOnePage: boolean;
};

export function overflowPxToMm(overflowPx: number): number {
  return Math.max(0, overflowPx) * PX_TO_MM;
}

export function formatOverflowAmount(measurement: Pick<PdfFitMeasurement, "overflowPx" | "overflowMm">): string {
  if (measurement.overflowPx <= 0) {
    return "0 mm";
  }
  const mm = measurement.overflowMm > 0 ? measurement.overflowMm : overflowPxToMm(measurement.overflowPx);
  return `~${mm.toFixed(1)} mm`;
}

/** Shared scrollHeight measurement — same DOM marker as browser PDF preview. */
export function measureResumePdfContentHeightPx(pageElement: { scrollHeight: number }): number {
  return pageElement.scrollHeight;
}

export function measureResumePdfFitFromContentHeight(contentHeightPx: number): PdfFitMeasurement {
  const detected = detectPdfPreviewPageOverflow({ contentHeightPx });
  const overflowPx = detected.overflowPx;
  return {
    contentHeightPx: detected.contentHeightPx,
    pageHeightPx: detected.pageHeightPx,
    overflowPx,
    overflowMm: overflowPxToMm(overflowPx),
    exceedsOnePage: detected.exceedsOnePage,
  };
}

export function measureResumePdfFitFromPageElement(
  pageElement: { scrollHeight: number } | null,
): PdfFitMeasurement {
  if (!pageElement) {
    const pageHeightPx = a4PageHeightPx();
    return measureResumePdfFitFromContentHeight(pageHeightPx);
  }
  return measureResumePdfFitFromContentHeight(measureResumePdfContentHeightPx(pageElement));
}

/** Puppeteer `page.evaluate` body — keep in sync with browser preview measurement. */
export function buildResumePdfContentHeightMeasureScript(pageMarkerClass: string): string {
  return `(() => {
    const el = document.querySelector(".${pageMarkerClass}");
    return el ? el.scrollHeight : ${A4_HEIGHT_MM / PX_TO_MM};
  })()`;
}

export const RESUME_PDF_CONTENT_HEIGHT_MEASURE_MARKER = RESUME_PDF_HTML_A4_MARKER;
