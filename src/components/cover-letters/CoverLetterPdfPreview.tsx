"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { measureCoverLetterPdfPreviewOverflow } from "@/lib/cover-letter/pdf-preview-overflow";
import { renderCoverLetterPdfHtml } from "@/lib/cover-letter/pdf-html";
import { a4PageHeightPx } from "@/lib/resume-draft/pdf-preview-overflow";
import { A4_HEIGHT_MM, A4_WIDTH_MM, PX_TO_MM } from "@/lib/resume-draft/preview-settings";

export const COVER_LETTER_PDF_PREVIEW_TEST_ID = "cover-letter-pdf-preview-iframe";
export const COVER_LETTER_PDF_PREVIEW_FRAME_TEST_ID = "cover-letter-pdf-preview-a4-frame";
export const COVER_LETTER_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID =
  "cover-letter-pdf-preview-overflow-badge";

type CoverLetterPdfPreviewProps = {
  body: string;
  draftId?: string;
  className?: string;
  onOverflowChange?: (exceedsOnePage: boolean) => void;
};

function a4WidthPx(): number {
  return A4_WIDTH_MM / PX_TO_MM;
}

/**
 * Renders the exact HTML/CSS sent to Puppeteer for cover letter PDF export.
 * Uses the same `renderCoverLetterPdfHtml()` function as server export.
 */
export function CoverLetterPdfPreview({
  body,
  draftId = "preview",
  className = "",
  onOverflowChange,
}: CoverLetterPdfPreviewProps) {
  const html = useMemo(() => renderCoverLetterPdfHtml(body), [body]);
  const frameRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [measurementState, setMeasurementState] = useState<{
    key: string;
    exceedsOnePage: boolean;
    contentHeightPx: number;
  }>(() => ({
    key: "",
    exceedsOnePage: false,
    contentHeightPx: a4PageHeightPx(),
  }));

  const previewKey = useMemo(
    () => [draftId, html.length, body.trim().length].join(":"),
    [draftId, html.length, body],
  );

  const exceedsOnePage =
    measurementState.key === previewKey ? measurementState.exceedsOnePage : false;
  const contentHeightPx =
    measurementState.key === previewKey ? measurementState.contentHeightPx : a4PageHeightPx();

  const remeasurePreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) {
      return;
    }
    const measurement = measureCoverLetterPdfPreviewOverflow(doc);
    setMeasurementState({
      key: previewKey,
      exceedsOnePage: measurement.exceedsOnePage,
      contentHeightPx: Math.max(measurement.pageHeightPx, measurement.contentHeightPx),
    });
  }, [previewKey]);

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
      setScale(Math.min(1, width / a4WidthPx()));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    remeasurePreview();
  }, [html, scale, remeasurePreview]);

  useEffect(() => {
    if (measurementState.key === previewKey) {
      onOverflowChange?.(measurementState.exceedsOnePage);
    }
  }, [measurementState, previewKey, onOverflowChange]);

  const pageHeightPx = a4PageHeightPx();
  const displayHeightPx = contentHeightPx * scale;
  const pageBreakTopPx = pageHeightPx * scale;

  function handleIframeLoad() {
    requestAnimationFrame(() => {
      remeasurePreview();
    });
  }

  if (!body.trim()) {
    return (
      <p className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 ${className}`}>
        Cover letter body is empty — add text in Raw Text view to preview the exported layout.
      </p>
    );
  }

  return (
    <div className={className}>
      {exceedsOnePage ? (
        <div
          data-testid={COVER_LETTER_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID}
          className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          <strong>PDF preview content extends beyond one page.</strong> Export allows only one
          page — shorten the letter before exporting.
        </div>
      ) : null}
      <div className="flex min-w-0 justify-center rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200 sm:p-5">
        <div
          ref={frameRef}
          data-testid={COVER_LETTER_PDF_PREVIEW_FRAME_TEST_ID}
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
            {exceedsOnePage ? (
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-dashed border-amber-500/80"
                style={{ top: `${pageBreakTopPx}px` }}
                aria-hidden
              />
            ) : null}
            <iframe
              key={previewKey}
              ref={iframeRef}
              data-testid={COVER_LETTER_PDF_PREVIEW_TEST_ID}
              title="Cover letter PDF preview"
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
        PDF Preview uses the same print HTML/CSS as export ({A4_WIDTH_MM} × {A4_HEIGHT_MM} mm,
        25 mm margins). Downloaded PDFs are rendered on the server and may differ slightly at line
        breaks due to Linux fonts.
      </p>
    </div>
  );
}
