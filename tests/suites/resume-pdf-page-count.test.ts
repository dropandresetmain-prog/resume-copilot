import { PDFDocument } from "pdf-lib";

import {
  buildOnePageExportBlockedJson,
  buildOnePagePdfValidation,
  ONE_PAGE_PDF_REMEDIATION,
} from "../../src/lib/resume-draft/pdf-export-validation";
import { countPdfPages } from "../../src/lib/resume-draft/pdf-page-count";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function createPdfWithPages(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    doc.addPage([595, 842]);
  }
  return doc.save();
}

async function main() {
  const onePage = await createPdfWithPages(1);
  const twoPages = await createPdfWithPages(2);

  const pdfExportPath = join(process.cwd(), "src/lib/resume-draft/pdf-export.ts");
  const exportRoutePath = join(process.cwd(), "src/app/api/export/resume-pdf/route.ts");
  const approveRoutePath = join(process.cwd(), "src/app/api/approve/resume-draft/route.ts");
  const validateRoutePath = join(process.cwd(), "src/app/api/validate/resume-pdf/route.ts");
  const pdfExportSource = readFileSync(pdfExportPath, "utf8");
  const exportRouteSource = readFileSync(exportRoutePath, "utf8");
  const approveRouteSource = readFileSync(approveRoutePath, "utf8");
  const validateRouteSource = readFileSync(validateRoutePath, "utf8");

  const onePageValidation = buildOnePagePdfValidation(1);
  const twoPageValidation = buildOnePagePdfValidation(2);
  const blocked = buildOnePageExportBlockedJson(2);

  const checks: [string, boolean][] = [
    ["count pdf pages single page", (await countPdfPages(onePage)) === 1],
    ["count pdf pages two pages", (await countPdfPages(twoPages)) === 2],
    ["one page validation passes", onePageValidation.valid === true],
    ["two page validation fails", twoPageValidation.valid === false],
    ["blocked json includes pageCount", blocked.pageCount === 2],
    ["blocked json includes suggested actions", (blocked.suggestedActions?.length ?? 0) > 0],
    ["remediation copy mentions layout controls", ONE_PAGE_PDF_REMEDIATION[0].includes("layout")],
    [
      "generateResumePdfResult exported",
      pdfExportSource.includes("export async function generateResumePdfResult") &&
        pdfExportSource.includes("pageCount"),
    ],
    [
      "export route blocks pageCount greater than one",
      exportRouteSource.includes("pageCount > 1") &&
        exportRouteSource.includes("422"),
    ],
    [
      "export route blocks before storage upload",
      /if \(pageCount > 1\)[\s\S]*return NextResponse\.json[\s\S]*uploadResumePdfExport/.test(
        exportRouteSource,
      ),
    ],
    [
      "approve route validates before update",
      approveRouteSource.includes("validateResumePdfExport") &&
        approveRouteSource.includes("serverPdfValidation"),
    ],
    [
      "approve route returns 422 when invalid",
      approveRouteSource.includes("422"),
    ],
    [
      "validate route exists",
      validateRouteSource.includes("validateResumePdfExport"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll PDF page-count validation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
