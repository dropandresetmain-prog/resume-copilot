import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  areExportLayoutSettingsEqual,
  sanitizeExportLayoutSettings,
} from "../../src/lib/resume-draft/export-layout-settings";
import { buildOnePagePdfValidation } from "../../src/lib/resume-draft/pdf-export-validation";

const approvedSettings = {
  bodyFontPx: 11,
  marginMm: 12,
  marginTopMm: 9,
  lineSpacing: 1.05,
  sectionSpacing: 0.6,
};

function exportReady(
  status: string,
  stored: typeof approvedSettings | undefined,
  current: typeof approvedSettings,
  serverPageCount?: number,
): boolean {
  return (
    status === "approved" &&
    areExportLayoutSettingsEqual(stored, current) &&
    serverPageCount === 1
  );
}

function main() {
  const sanitized = sanitizeExportLayoutSettings(approvedSettings);
  const previewClientPath = join(
    process.cwd(),
    "src/components/pages/ResumePreviewPageClient.tsx",
  );
  const previewSource = readFileSync(previewClientPath, "utf8");
  const approveClientPath = join(
    process.cwd(),
    "src/lib/resume-draft/approve-resume-draft-client.ts",
  );
  const approveClientSource = readFileSync(approveClientPath, "utf8");
  const outputClientPath = join(
    process.cwd(),
    "src/components/pages/OutputEditorPageClient.tsx",
  );
  const outputClientSource = readFileSync(outputClientPath, "utf8");

  const checks: [string, boolean][] = [
    [
      "export ready requires server page count one",
      exportReady("approved", sanitized, approvedSettings, 1),
    ],
    [
      "export not ready without server validation",
      !exportReady("approved", sanitized, approvedSettings, undefined),
    ],
    [
      "export not ready when server reports two pages",
      !exportReady("approved", sanitized, approvedSettings, 2),
    ],
    [
      "two page server validation fails",
      buildOnePagePdfValidation(2).valid === false,
    ],
    [
      "preview page calls approve api",
      previewSource.includes("approveResumeDraftForExport") &&
        previewSource.includes("Validating server PDF"),
    ],
    [
      "preview tracks validation overflow",
      previewSource.includes("overflowMm") &&
        previewSource.includes("ResumePdfOnePageBlockedError"),
    ],
    [
      "approve client handles 422",
      approveClientSource.includes("422") &&
        approveClientSource.includes("ResumePdfOnePageBlockedError"),
    ],
    [
      "export ready checks serverPdfValidation page count",
      previewSource.includes("serverPdfValidation?.pageCount === 1"),
    ],
    // M4 — Folio Output Editor surfaces the same approval gate (no route changes).
    [
      "output editor calls approve api",
      outputClientSource.includes("approveResumeDraftForExport") &&
        outputClientSource.includes("Validating server PDF"),
    ],
    [
      "output editor surfaces one-page block",
      outputClientSource.includes("ResumePdfOnePageBlockedError") &&
        outputClientSource.includes("formatOnePageBlockedMessage"),
    ],
    [
      "output editor export ready checks server page count",
      outputClientSource.includes("serverPdfValidation?.pageCount === 1"),
    ],
    [
      "bottom Export and delivery card renders downloads only when export ready",
      outputClientSource.includes('data-testid="output-approve-export"') &&
        outputClientSource.includes("{exportReady ? (") &&
        outputClientSource.includes("handleExportPdf") &&
        outputClientSource.includes("handleExportDocx"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume approve validation checks passed.");
}

main();
