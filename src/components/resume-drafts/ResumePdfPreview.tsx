"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { renderResumePdfHtml } from "@/lib/resume-draft/pdf-html";
import { A4_HEIGHT_MM, A4_WIDTH_MM, PX_TO_MM } from "@/lib/resume-draft/preview-settings";

export const RESUME_PDF_PREVIEW_TEST_ID = "resume-pdf-preview-iframe";
export const RESUME_PDF_PREVIEW_FRAME_TEST_ID = "resume-pdf-preview-a4-frame";

type ResumePdfPreviewProps = {
  documentModel: ResumeDocumentModel;
  className?: string;
};

/** A4 width in CSS pixels at 96dpi — used for scale-to-fit. */
function a4WidthPx(): number {
  return (A4_WIDTH_MM / PX_TO_MM);
}

/**
 * Renders the exact HTML/CSS sent to Puppeteer for PDF export.
 * Isolated iframe — no app Tailwind/styles leak in.
 * Preserves A4 aspect ratio on mobile via scale-to-fit (content does not reflow).
 */
export function ResumePdfPreview({ documentModel, className = "" }: ResumePdfPreviewProps) {
  const html = useMemo(() => renderResumePdfHtml(documentModel), [documentModel]);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

  const scaledHeightPx = (A4_HEIGHT_MM / PX_TO_MM) * scale;

  return (
    <div className={className}>
      <div className="flex justify-center rounded-xl bg-slate-200/80 p-4 sm:p-6">
        <div
          ref={frameRef}
          data-testid={RESUME_PDF_PREVIEW_FRAME_TEST_ID}
          className="w-full max-w-full overflow-x-auto"
          style={{ maxWidth: `${A4_WIDTH_MM}mm` }}
        >
          <div
            className="relative mx-auto shadow-xl ring-1 ring-slate-300"
            style={{
              width: `${A4_WIDTH_MM * scale}mm`,
              height: `${scaledHeightPx}px`,
            }}
          >
            <iframe
              data-testid={RESUME_PDF_PREVIEW_TEST_ID}
              title="PDF Preview"
              srcDoc={html}
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: `${A4_WIDTH_MM}mm`,
                height: `${A4_HEIGHT_MM}mm`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        PDF Preview — exact print HTML/CSS used for export ({A4_WIDTH_MM} × {A4_HEIGHT_MM} mm).
        Scales to fit on narrow screens; layout does not reflow.
      </p>
    </div>
  );
}
