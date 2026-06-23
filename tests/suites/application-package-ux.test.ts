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
  const reviewCenter = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationReviewCenter.tsx"),
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
  const approveIndex = indexOrInfinity(resumePreview, "exportControls={");
  const coverLetterIndex = indexOrInfinity(resumePreview, 'data-section="application-package-cover-letter"');
  const companyResearchIndex = indexOrInfinity(resumePreview, 'data-section="application-package-company-research"');
  const developerIndex = indexOrInfinity(resumePreview, "Developer details");
  const editToggleIndex = indexOrInfinity(resumePreview, "edit-resume-content-toggle");

  const checks: [string, boolean][] = [
    ["inline cover letter body on package page", coverLetterPanel.includes("application-package-cover-letter-body")],
    ["edit cover letter button exists", coverLetterPanel.includes("Edit cover letter")],
    ["cover letter download buttons exist", coverLetterPanel.includes("DownloadCoverLetterPdfButton")],
    ["approve export before cover letter section", approveIndex < coverLetterIndex],
    ["approve export before company research", approveIndex < companyResearchIndex],
    ["approve export before developer details", approveIndex < developerIndex],
    ["review center owns approve export action row", reviewCenter.includes('data-section="resume-approve-export"')],
    ["review center two-step sequence labels", reviewCenter.includes("Step 1") && reviewCenter.includes("Step 2")],
    ["review center sequential approve export", reviewCenter.includes("Step 1 — Approve") && reviewCenter.includes("Step 2 — Export (after approval)")],
    ["review center export ready collapses approve", reviewCenter.includes("exportReady")],
    [
      "approve and export controls co-located",
      reviewCenter.includes("exportControls") &&
        resumePreview.indexOf("exportControls={") < resumePreview.indexOf('title="Resume"') &&
        resumePreview.indexOf("DownloadResumePdfButton") < resumePreview.indexOf('title="Resume"') &&
        resumePreview.indexOf("DownloadResumeDocxButton") < resumePreview.indexOf('title="Resume"'),
    ],
    ["evidence panel renamed edit resume content", evidencePanel.includes("Edit resume content")],
    ["edit resume content hidden by default", resumePreview.includes("showEditResumeContent")],
    ["edit resume content toggle button", resumePreview.includes("edit-resume-content-toggle")],
    ["edit resume content secondary surface", resumePreview.includes("Secondary editing")],
    ["company research collapsed by default", resumePreview.includes("defaultOpen={false}")],
    ["developer details wrapper", resumePreview.includes("Developer details")],
    ["debug json under developer details", developerIndex < indexOrInfinity(resumePreview, "Debug JSON")],
    ["pdf html under developer details", developerIndex < indexOrInfinity(resumePreview, "PDF layout HTML source")],
    ["browser layout under developer details", developerIndex < indexOrInfinity(resumePreview, "Advanced browser layout estimate")],
    ["resume assessment under developer details", developerIndex < indexOrInfinity(resumePreview, "<ResumeAssessmentPanel")],
    ["application review center component", resumePreview.includes("ApplicationReviewCenter")],
    ["review center before approve export section", reviewCenterIndex < approveIndex],
    ["resume card has no duplicate approve button", !resumePreview.includes("onClick={handleApproveForExport}")],
    ["no open formal cover letter only cta", !resumePreview.includes("ResumeCoverLetterPanel")],
    ["company research summary shows view edit", companyPanel.includes("View / edit")],
    ["company research summary preview visible when collapsed", companyPanel.includes("summaryPreview")],
    ["edit toggle before developer details", editToggleIndex < developerIndex],
    ["review center shows go to cover letter when no coverLetterId", reviewCenter.includes("Go to cover letter") && reviewCenter.includes("#package-cover-letter")],
    ["review center always has cover letter action", reviewCenter.includes("Edit cover letter") && reviewCenter.includes("Go to cover letter")],
    ["review center checklists behind disclosure", reviewCenter.includes("review-details-disclosure") && reviewCenter.includes("Review details")],
    ["draft ready status type defined", reviewCenter.includes("DRAFT_READY") || resumePreview.includes("DRAFT_READY") || reviewCenter.includes("exportReady")],
    ["package page header compact", resumePreview.includes("compact") && resumePreview.includes("Review and approve")],
    ["package page passes exportReady to review center", resumePreview.includes("exportReady={exportReady}")],
    ["package rail research is conditional on companyContext", resumePreview.includes("companyContext ? [[\"Research\"") || resumePreview.includes("companyContext ? [") && resumePreview.includes('"Research"') && resumePreview.includes('"#package-research"')],
    ["package rail research not hardcoded", !resumePreview.match(/\["Research", "#package-research"\],\s*\["Edit"/)],
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
