import {
  a4PageHeightPx,
  detectPdfPreviewPageOverflow,
  type PdfPreviewOverflowMeasurement,
} from "@/lib/resume-draft/pdf-preview-overflow";

/** Measure cover letter preview height from export HTML rendered in an iframe. */
export function measureCoverLetterPdfPreviewOverflow(doc: Document): PdfPreviewOverflowMeasurement {
  const pageHeightPx = a4PageHeightPx();
  const contentHeightPx = doc.body?.scrollHeight ?? pageHeightPx;
  return detectPdfPreviewPageOverflow({ contentHeightPx, pageHeightPx });
}
