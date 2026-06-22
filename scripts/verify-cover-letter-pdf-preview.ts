import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  COVER_LETTER_PDF_PREVIEW_TEST_ID,
} from "../src/components/cover-letters/CoverLetterPdfPreview";
import { renderCoverLetterPdfHtml } from "../src/lib/cover-letter/pdf-html";
import { generateCoverLetterPdfBuffer } from "../src/lib/cover-letter/pdf-export";

const SAMPLE_BODY = `Dear Hiring Manager,

I am applying for the B2B Sales Manager role at ShelfPerfect. My background spans stakeholder management and commercial partnerships.

Regards,
Min Htet`;

function main() {
  const html = renderCoverLetterPdfHtml(SAMPLE_BODY);
  const applicationPackagePanel = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationPackageCoverLetterPanel.tsx"),
    "utf8",
  );
  const coverLetterPage = readFileSync(
    join(process.cwd(), "src/components/pages/CoverLetterPreviewPageClient.tsx"),
    "utf8",
  );
  const previewComponent = readFileSync(
    join(process.cwd(), "src/components/cover-letters/CoverLetterPdfPreview.tsx"),
    "utf8",
  );
  const pdfExport = readFileSync(
    join(process.cwd(), "src/lib/cover-letter/pdf-export.ts"),
    "utf8",
  );
  const pdfRoute = readFileSync(
    join(process.cwd(), "src/app/api/export/cover-letter-pdf/route.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    [
      "Case A: cover letter preview html renders successfully",
      html.includes("<!DOCTYPE html>") &&
        html.includes("Times New Roman") &&
        html.includes("<p>Dear Hiring Manager,</p>"),
    ],
    [
      "Case B: preview uses renderCoverLetterPdfHtml",
      previewComponent.includes("renderCoverLetterPdfHtml"),
    ],
    [
      "Case B: export uses renderCoverLetterPdfHtml",
      pdfExport.includes("renderCoverLetterPdfHtml"),
    ],
    [
      "Case B: preview and export share one renderer",
      previewComponent.includes("renderCoverLetterPdfHtml") &&
        pdfExport.includes("renderCoverLetterPdfHtml"),
    ],
    [
      "Case C: application package defaults to PDF preview",
      applicationPackagePanel.includes('useState<CoverLetterBodyView>("pdf")') &&
        applicationPackagePanel.includes("CoverLetterPdfPreview"),
    ],
    [
      "Case D: application package view toggle",
      applicationPackagePanel.includes("CoverLetterBodyViewSwitch"),
    ],
    [
      "Case D: dedicated page view toggle",
      coverLetterPage.includes("CoverLetterBodyViewSwitch") &&
        coverLetterPage.includes('useState<CoverLetterBodyView>("pdf")'),
    ],
    [
      "Case E: dedicated page shows PDF preview",
      coverLetterPage.includes("CoverLetterPdfPreview"),
    ],
    [
      "Case F: export route still uses pdf buffer generator",
      pdfRoute.includes("generateCoverLetterPdfBuffer"),
    ],
    [
      "Case F: export generator unchanged entry point",
      typeof generateCoverLetterPdfBuffer === "function",
    ],
    [
      "preview iframe test id exported",
      previewComponent.includes(COVER_LETTER_PDF_PREVIEW_TEST_ID),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll cover letter PDF preview checks passed.");
}

main();
