import { readFileSync } from "node:fs";
import { join } from "node:path";

function indexOrInfinity(content: string, needle: string): number {
  const index = content.indexOf(needle);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function main() {
  const resumePreview = readFileSync(
    join(process.cwd(), "src/components/pages/ResumePreviewPageClient.tsx"),
    "utf8",
  );
  const coverLetterPanel = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationPackageCoverLetterPanel.tsx"),
    "utf8",
  );
  const evidencePanel = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx"),
    "utf8",
  );
  const companyPanel = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyContextPreviewPanel.tsx"),
    "utf8",
  );

  const reviewCenterIndex = indexOrInfinity(resumePreview, "ApplicationReviewCenter");
  const approveIndex = indexOrInfinity(resumePreview, 'data-section="resume-approve-export"');
  const coverLetterIndex = indexOrInfinity(resumePreview, 'data-section="application-package-cover-letter"');
  const companyResearchIndex = indexOrInfinity(resumePreview, 'data-section="application-package-company-research"');
  const advancedIndex = indexOrInfinity(resumePreview, "Advanced options");
  const editToggleIndex = indexOrInfinity(resumePreview, "edit-resume-content-toggle");

  const checks: [string, boolean][] = [
    ["inline cover letter body on package page", coverLetterPanel.includes("application-package-cover-letter-body")],
    ["edit cover letter button exists", coverLetterPanel.includes("Edit cover letter")],
    ["cover letter download buttons exist", coverLetterPanel.includes("DownloadCoverLetterPdfButton")],
    ["approve export before cover letter section", approveIndex < coverLetterIndex],
    ["approve export before company research", approveIndex < companyResearchIndex],
    ["approve export before advanced options", approveIndex < advancedIndex],
    ["evidence panel renamed edit resume content", evidencePanel.includes("Edit resume content")],
    ["edit resume content hidden by default", resumePreview.includes("showEditResumeContent")],
    ["edit resume content toggle button", resumePreview.includes("edit-resume-content-toggle")],
    ["company research collapsed by default", resumePreview.includes("defaultOpen={false}")],
    ["advanced options wrapper", resumePreview.includes("Advanced options")],
    ["debug json under advanced options", advancedIndex < indexOrInfinity(resumePreview, "Debug JSON")],
    ["pdf html under advanced options", advancedIndex < indexOrInfinity(resumePreview, "PDF layout HTML source")],
    ["browser layout under advanced options", advancedIndex < indexOrInfinity(resumePreview, "Advanced browser layout estimate")],
    ["application review center component", resumePreview.includes("ApplicationReviewCenter")],
    ["review center before approve export section", reviewCenterIndex < approveIndex],
    ["resume card has no duplicate approve button", !resumePreview.includes("onClick={handleApproveForExport}")],
    ["no open formal cover letter only cta", !resumePreview.includes("ResumeCoverLetterPanel")],
    ["company research summary shows view edit", companyPanel.includes("View / edit")],
    ["company research summary preview visible when collapsed", companyPanel.includes("summaryPreview")],
    ["edit toggle before advanced section", editToggleIndex < advancedIndex],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll application package UX checks passed.");
}

main();
