import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getExportDeliveryMetrics,
  parseContentDispositionFileName,
  resetExportDeliveryMetrics,
  resolveExportDownloadBehavior,
  resolveExportFileName,
} from "../src/lib/resume-draft/export-client";
import { buildResumePdfFileName } from "../src/lib/resume-draft/export-filename";

function main() {
  const exportClientPath = join(process.cwd(), "src/lib/resume-draft/export-client.ts");
  const exportClientSource = readFileSync(exportClientPath, "utf8");
  const pdfStoragePath = join(process.cwd(), "src/lib/supabase/resume-pdf-storage.ts");
  const docxStoragePath = join(process.cwd(), "src/lib/supabase/resume-docx-storage.ts");
  const pdfButtonPath = join(
    process.cwd(),
    "src/components/resume-drafts/DownloadResumePdfButton.tsx",
  );
  const docxButtonPath = join(
    process.cwd(),
    "src/components/resume-drafts/DownloadResumeDocxButton.tsx",
  );
  const pdfButtonSource = readFileSync(pdfButtonPath, "utf8");
  const docxButtonSource = readFileSync(docxButtonPath, "utf8");
  const pdfStorageSource = readFileSync(pdfStoragePath, "utf8");
  const docxStorageSource = readFileSync(docxStoragePath, "utf8");

  resetExportDeliveryMetrics();
  const expectedName = buildResumePdfFileName({
    fullName: "Hset Min Htet",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const checks: [string, boolean][] = [
    [
      "desktop pdf uses anchor download behavior",
      resolveExportDownloadBehavior("pdf", { mobile: false }) === "anchor-download",
    ],
    [
      "desktop docx uses anchor download behavior",
      resolveExportDownloadBehavior("docx", { mobile: false }) === "anchor-download",
    ],
    [
      "resolve export fileName prefers api value",
      resolveExportFileName(expectedName, null, "Resume.pdf") === expectedName,
    ],
    [
      "resolve export fileName parses content disposition",
      resolveExportFileName(
        undefined,
        `attachment; filename="${expectedName}"`,
        "Resume.pdf",
      ) === expectedName,
    ],
    [
      "parse content disposition filename",
      parseContentDispositionFileName(`attachment; filename="${expectedName}"`) === expectedName,
    ],
    [
      "deliver exported file is async blob pipeline",
      exportClientSource.includes("export async function deliverExportedFile") &&
        exportClientSource.includes("fetchExportBlob") &&
        exportClientSource.includes("triggerFileDownload"),
    ],
    [
      "deliver exported file does not open remote pdf tab",
      exportClientSource.includes("triggerFileDownload(fileName, objectUrl)") &&
        !exportClientSource.includes("openPdfInNewTab(downloadUrl);"),
    ],
    [
      "export delivery metrics track api blob and delivery",
      exportClientSource.includes("apiRequests") &&
        exportClientSource.includes("blobFetches") &&
        exportClientSource.includes("deliveryActions"),
    ],
    [
      "pdf button awaits single deliver call",
      pdfButtonSource.includes("await exportResumePdfFromApi") &&
        pdfButtonSource.includes("await deliverExportedFile") &&
        !pdfButtonSource.includes("openPdfInNewTab"),
    ],
    [
      "docx button awaits single deliver call",
      docxButtonSource.includes("await exportResumeDocxFromApi") &&
        docxButtonSource.includes("await deliverExportedFile"),
    ],
    [
      "pdf storage signed url includes download filename",
      pdfStorageSource.includes("createSignedUrl") &&
        pdfStorageSource.includes("download: options.fileName"),
    ],
    [
      "docx storage signed url includes download filename",
      docxStorageSource.includes("createSignedUrl") &&
        docxStorageSource.includes("download: options.fileName"),
    ],
    [
      "metrics reset helper exported",
      typeof resetExportDeliveryMetrics === "function" &&
        typeof getExportDeliveryMetrics === "function",
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll export delivery checks passed.");
}

main();
