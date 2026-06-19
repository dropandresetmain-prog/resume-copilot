"use client";

import { useMemo } from "react";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { renderResumePdfHtml } from "@/lib/resume-draft/pdf-html";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";

export const RESUME_PDF_PREVIEW_TEST_ID = "resume-pdf-preview-iframe";

type ResumePdfPreviewProps = {
  documentModel: ResumeDocumentModel;
  className?: string;
};

/**
 * Renders the exact HTML/CSS sent to Puppeteer for PDF export.
 * Isolated iframe — no app Tailwind/styles leak in.
 */
export function ResumePdfPreview({ documentModel, className = "" }: ResumePdfPreviewProps) {
  const html = useMemo(() => renderResumePdfHtml(documentModel), [documentModel]);

  return (
    <div className={className}>
      <div className="flex justify-center rounded-xl bg-slate-200/80 p-4 sm:p-6">
        <iframe
          data-testid={RESUME_PDF_PREVIEW_TEST_ID}
          title="PDF Preview"
          srcDoc={html}
          className="border-0 bg-white shadow-xl ring-1 ring-slate-300"
          style={{
            width: `min(${A4_WIDTH_MM}mm, 100%)`,
            height: `${A4_HEIGHT_MM}mm`,
          }}
          sandbox="allow-same-origin"
        />
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        PDF Preview — exact print HTML/CSS used for export ({A4_WIDTH_MM} × {A4_HEIGHT_MM} mm)
      </p>
    </div>
  );
}
