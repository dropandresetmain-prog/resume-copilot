"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import {
  a4PageHeightPx,
  measureResumePdfPreviewOverflow,
  type PdfPreviewOverflowMeasurement,
} from "@/lib/resume-draft/pdf-preview-overflow";
import { renderResumePdfHtml } from "@/lib/resume-draft/pdf-html";
import { A4_HEIGHT_MM, A4_WIDTH_MM, PX_TO_MM } from "@/lib/resume-draft/preview-settings";

export const RESUME_PDF_PREVIEW_TEST_ID = "resume-pdf-preview-iframe";
export const RESUME_PDF_PREVIEW_FRAME_TEST_ID = "resume-pdf-preview-a4-frame";
export const RESUME_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID = "resume-pdf-preview-overflow-badge";
export const RESUME_PDF_PREVIEW_PAGE_BREAK_TEST_ID = "resume-pdf-preview-page-break";

type ResumePdfPreviewProps = {
  documentModel: ResumeDocumentModel;
  className?: string;
  onOverflowChange?: (measurement: PdfPreviewOverflowMeasurement) => void;
};

/** A4 width in CSS pixels at 96dpi — used for scale-to-fit. */
function a4WidthPx(): number {
  return A4_WIDTH_MM / PX_TO_MM;
}

function defaultOverflowMeasurement(): PdfPreviewOverflowMeasurement {
  const pageHeightPx = a4PageHeightPx();
  return {
    contentHeightPx: pageHeightPx,
    pageHeightPx,
    exceedsOnePage: false,
    overflowPx: 0,
  };
}

/**
 * Renders the exact HTML/CSS sent to Puppeteer for PDF export.
 * Isolated iframe — no app Tailwind/styles leak in.
 * Preserves A4 aspect ratio on mobile via scale-to-fit (content does not reflow).
 * Expands vertically when content exceeds one page so overflow is never silently clipped.
 */
export function ResumePdfPreview({
  documentModel,
  className = "",
  onOverflowChange,
}: ResumePdfPreviewProps) {
  const html = useMemo(() => renderResumePdfHtml(documentModel), [documentModel]);
  const frameRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [measurementState, setMeasurementState] = useState<{
    key: string;
    overflow: PdfPreviewOverflowMeasurement;
  }>(() => ({
    key: "",
    overflow: defaultOverflowMeasurement(),
  }));

  const previewKey = useMemo(
    () =>
      [
        documentModel.draftId,
        documentModel.layoutSettings.bodyFontPx,
        documentModel.layoutSettings.marginMm,
        documentModel.layoutSettings.marginTopMm,
        documentModel.layoutSettings.lineSpacing,
        documentModel.layoutSettings.sectionSpacing,
        html.length,
      ].join(":"),
    [documentModel, html.length],
  );

  const overflow =
    measurementState.key === previewKey
      ? measurementState.overflow
      : defaultOverflowMeasurement();

  const remeasurePreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) {
      return;
    }
    setMeasurementState({
      key: previewKey,
      overflow: measureResumePdfPreviewOverflow(doc),
    });
  }, [previewKey]);

  useEffect(() => {
    if (measurementState.key === previewKey) {
      onOverflowChange?.(measurementState.overflow);
    }
  }, [measurementState, previewKey, onOverflowChange]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    function updateScale() {
      const el = frameRef.current;
      if (!el) {
        return;
      }
      const width = el.clientWidth;
      if (width <= 0) {
        return;
      }
      const next = Math.min(1, width / a4WidthPx());
      setScale(next);
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    remeasurePreview();
  }, [html, scale, remeasurePreview]);

  const pageHeightPx = a4PageHeightPx();
  const contentHeightPx = Math.max(pageHeightPx, overflow.contentHeightPx);
  const displayHeightPx = contentHeightPx * scale;
  const pageBreakTopPx = pageHeightPx * scale;

  function handleIframeLoad() {
    requestAnimationFrame(() => {
      remeasurePreview();
    });
  }

  return (
    <div className={className}>
      {overflow.exceedsOnePage ? (
        <div
          data-testid={RESUME_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID}
          className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          <strong>PDF preview content extends beyond one page.</strong> Scroll the preview to see
          overflow. Server export may paginate differently due to Linux fonts — use Approve
          for server one-page validation before export.
        </div>
      ) : (
        <div
          data-testid="preview-export-fit-ok"
          className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
          role="status"
        >
          Browser preview fits one page. Export still requires{" "}
          <strong>Approve for export</strong> — server Puppeteer validation is the export gate and may
          differ slightly from this preview.
        </div>
      )}
      <div className="flex min-w-0 justify-center rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200 sm:p-5">
        <div
          ref={frameRef}
          data-testid={RESUME_PDF_PREVIEW_FRAME_TEST_ID}
          className="min-w-0 w-full max-w-full overflow-hidden"
          style={{ maxWidth: `${A4_WIDTH_MM}mm` }}
        >
          <div
            className="relative mx-auto shadow-xl ring-1 ring-slate-300"
            style={{
              width: `${A4_WIDTH_MM * scale}mm`,
              height: `${displayHeightPx}px`,
            }}
          >
            {overflow.exceedsOnePage ? (
              <div
                data-testid={RESUME_PDF_PREVIEW_PAGE_BREAK_TEST_ID}
                className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-dashed border-amber-500/80"
                style={{ top: `${pageBreakTopPx}px` }}
                aria-hidden
              />
            ) : null}
            <iframe
              key={previewKey}
              ref={iframeRef}
              data-testid={RESUME_PDF_PREVIEW_TEST_ID}
              title="PDF Preview"
              srcDoc={html}
              onLoad={handleIframeLoad}
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: `${A4_WIDTH_MM}mm`,
                height: `${contentHeightPx}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        PDF Preview uses the same print HTML/CSS as export ({A4_WIDTH_MM} × {A4_HEIGHT_MM} mm). It is
        the closest visual preview in your browser; downloaded PDFs are rendered on the server and
        may differ slightly at line breaks. Scales to fit on narrow screens without reflowing
        layout.
      </p>
    </div>
  );
}
