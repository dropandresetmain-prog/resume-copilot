import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  a4PageHeightPx,
  detectPdfPreviewPageOverflow,
  measureResumePdfPreviewContentHeightPx,
  measureResumePdfPreviewOverflow,
} from "../../src/lib/resume-draft/pdf-preview-overflow";
import { RESUME_PDF_HTML_A4_MARKER } from "../../src/lib/resume-draft/resume-layout-styles";
import { A4_HEIGHT_MM, PX_TO_MM } from "../../src/lib/resume-draft/preview-settings";

function main() {
  const pageHeightPx = a4PageHeightPx();

  const fitsOnePage = detectPdfPreviewPageOverflow({
    contentHeightPx: pageHeightPx,
  });
  const barelyOverflow = detectPdfPreviewPageOverflow({
    contentHeightPx: pageHeightPx + 2,
  });
  const withinTolerance = detectPdfPreviewPageOverflow({
    contentHeightPx: pageHeightPx + 0.5,
    tolerancePx: 1,
  });
  const minHeightOnly = detectPdfPreviewPageOverflow({
    contentHeightPx: pageHeightPx,
    pageHeightPx,
  });

  const mockDocFits = {
    querySelector(selector: string) {
      if (selector === `.${RESUME_PDF_HTML_A4_MARKER}`) {
        return { scrollHeight: pageHeightPx };
      }
      return null;
    },
  };

  const mockDocOverflow = {
    querySelector(selector: string) {
      if (selector === `.${RESUME_PDF_HTML_A4_MARKER}`) {
        return { scrollHeight: pageHeightPx + 48 };
      }
      return null;
    },
  };

  const pdfPreviewPath = join(
    process.cwd(),
    "src/components/resume-drafts/ResumePdfPreview.tsx",
  );
  const pdfPreviewSource = readFileSync(pdfPreviewPath, "utf8");
  const pdfExportPath = join(process.cwd(), "src/lib/resume-draft/pdf-export.ts");
  const pdfExportSource = readFileSync(pdfExportPath, "utf8");

  const checks: [string, boolean][] = [
    ["a4 page height uses 96dpi conversion", Math.abs(pageHeightPx - (A4_HEIGHT_MM / PX_TO_MM)) < 0.01],
    ["content at page height does not overflow", !fitsOnePage.exceedsOnePage],
    ["content above tolerance overflows", barelyOverflow.exceedsOnePage],
    ["subpixel overflow within tolerance does not overflow", !withinTolerance.exceedsOnePage],
    ["min-height-only content reports one page", !minHeightOnly.exceedsOnePage],
    [
      "scrollHeight measurement used for content height",
      measureResumePdfPreviewContentHeightPx({ scrollHeight: 1200 }) === 1200,
    ],
    [
      "document overflow measurement reads page marker scrollHeight",
      measureResumePdfPreviewOverflow(mockDocOverflow).exceedsOnePage,
    ],
    [
      "document fit measurement when scrollHeight equals page height",
      !measureResumePdfPreviewOverflow(mockDocFits).exceedsOnePage,
    ],
    [
      "pdf preview measures iframe contentDocument",
      pdfPreviewSource.includes("measureResumePdfPreviewOverflow") &&
        pdfPreviewSource.includes("contentDocument"),
    ],
    [
      "pdf preview iframe height follows content height",
      pdfPreviewSource.includes("contentHeightPx") &&
        !pdfPreviewSource.includes(`height: \`\${A4_HEIGHT_MM}mm\``),
    ],
    [
      "pdf preview shows overflow badge",
      pdfPreviewSource.includes("RESUME_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID") &&
        pdfPreviewSource.includes("extends beyond one page"),
    ],
    [
      "pdf preview shows page break marker",
      pdfPreviewSource.includes("RESUME_PDF_PREVIEW_PAGE_BREAK_TEST_ID"),
    ],
    [
      "pdf preview copy does not claim perfect parity",
      pdfPreviewSource.includes("closest visual preview") &&
        pdfPreviewSource.includes("may differ slightly"),
    ],
    [
      "pdf export awaits document fonts ready",
      pdfExportSource.includes("waitForPdfDocumentFonts") &&
        pdfExportSource.includes("document.fonts?.ready"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll PDF preview overflow checks passed.");
}

main();
