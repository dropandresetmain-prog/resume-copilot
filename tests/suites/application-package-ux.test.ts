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
  const tailoringPanel = readFileSync(
    join(process.cwd(), "src/components/application-package/PackageTailoringDiagnosticsPanel.tsx"),
    "utf8",
  );

  const fitSummaryIndex = indexOrInfinity(resumePreview, 'data-testid="package-fit-summary-top"');
  const tailoringDiagnosticsIndex = indexOrInfinity(
    resumePreview,
    'data-testid="package-tailoring-diagnostics-top"',
  );
  const reviewCenterIndex = indexOrInfinity(resumePreview, 'data-testid="package-review-rail"');
  const approveIndex = indexOrInfinity(resumePreview, "exportControls={");
  const editModeIndex = indexOrInfinity(resumePreview, "package-fix-mode-edit-resume");
  const prominentPreviewIndex = indexOrInfinity(resumePreview, "package-prominent-preview");
  const developerIndex = indexOrInfinity(resumePreview, "Developer details");

  const checks: [string, boolean][] = [
    ["inline cover letter body on package page", coverLetterPanel.includes("application-package-cover-letter-body")],
    ["edit cover letter button exists", coverLetterPanel.includes("Edit cover letter")],
    ["cover letter download buttons exist", coverLetterPanel.includes("DownloadCoverLetterPdfButton")],
    ["approve export before cover letter section", approveIndex < indexOrInfinity(resumePreview, 'data-section="application-package-cover-letter"')],
    ["approve export before company research", approveIndex < indexOrInfinity(resumePreview, 'data-section="application-package-company-research"')],
    ["approve export before developer details", approveIndex < developerIndex],
    ["review center owns approve export action row", reviewCenter.includes('data-section="resume-approve-export"')],
    ["review center two-step sequence labels", reviewCenter.includes("Step 1") && reviewCenter.includes("Step 2")],
    ["review center sequential approve export", reviewCenter.includes("Step 1 — Approve") && reviewCenter.includes("Step 2 — Export (after approval)")],
    ["review center export ready collapses approve", reviewCenter.includes("exportReady")],
    [
      "approve and export controls co-located",
      reviewCenter.includes("exportControls") &&
        resumePreview.indexOf("exportControls={") < prominentPreviewIndex,
    ],
    ["evidence panel fix resume evidence title", evidencePanel.includes("Fix resume evidence")],
    ["evidence panel ranked add list", evidencePanel.includes('data-testid="add-evidence-ranked-list"')],
    ["evidence panel category chips", evidencePanel.includes("data-evidence-category")],
    ["evidence panel uses spine ranked list helper", evidencePanel.includes("buildAddEvidenceList")],
    ["package structured editor on page", resumePreview.includes("ResumeDraftReviewWorkspace")],
    ["package decision tree", reviewCenter.includes("PackageDecisionTree")],
    ["package fit summary near top", fitSummaryIndex < reviewCenterIndex && fitSummaryIndex < editModeIndex],
    [
      "tailoring diagnostics panel wired on package page",
      resumePreview.includes("PackageTailoringDiagnosticsPanel") &&
        resumePreview.includes("buildPackageTailoringDiagnostics"),
    ],
    [
      "tailoring diagnostics after fit summary",
      fitSummaryIndex < tailoringDiagnosticsIndex && tailoringDiagnosticsIndex < reviewCenterIndex,
    ],
    [
      "tailoring diagnostics shows evidence sections",
      tailoringPanel.includes("Strongest evidence selected") &&
        tailoringPanel.includes("tailoring-omitted-evidence") &&
        tailoringPanel.includes("tailoring-cover-letter-proof"),
    ],
    [
      "tailoring diagnostics next actions",
      tailoringPanel.includes("tailoring-next-actions") &&
        tailoringPanel.includes("tailoring-fix-resume-evidence") &&
        tailoringPanel.includes("tailoring-edit-cover-letter-evidence"),
    ],
    [
      "tailoring diagnostics no ai on load copy",
      tailoringPanel.includes("no AI on page load"),
    ],
    [
      "tailoring diagnostics omitted section advisory",
      tailoringPanel.includes("Advisory only") &&
        tailoringPanel.includes("not a defect"),
    ],
    [
      "tailoring diagnostics accept risk action",
      tailoringPanel.includes("tailoring-accept-risk") &&
        resumePreview.includes("onScrollToApprove={scrollToApprove}"),
    ],
    [
      "tailoring diagnostics section empty states",
      tailoringPanel.includes("-empty") && tailoringPanel.includes("Legacy draft"),
    ],
    ["edit resume hidden by default", resumePreview.includes("activeFixMode") && resumePreview.includes('activeFixMode === "edit-resume"')],
    ["back to review control", resumePreview.includes("back-to-package-review")],
    ["review-first banner", resumePreview.includes("package-review-first-banner")],
    ["company research collapsed by default", resumePreview.includes("defaultOpen={false}")],
    ["developer details wrapper", resumePreview.includes("Developer details")],
    ["debug json under developer details", developerIndex < indexOrInfinity(resumePreview, "Debug JSON")],
    ["pdf html under developer details", developerIndex < indexOrInfinity(resumePreview, "PDF layout HTML source")],
    ["browser layout under developer details", developerIndex < indexOrInfinity(resumePreview, "Advanced browser layout estimate")],
    ["resume assessment under developer details", developerIndex < indexOrInfinity(resumePreview, "<ResumeAssessmentPanel")],
    ["application review center component", resumePreview.includes("ApplicationReviewCenter")],
    ["review center before approve export section", reviewCenter.indexOf("application-fix-actions") < reviewCenter.indexOf("resume-approve-export")],
    ["resume card has no duplicate approve button", !resumePreview.includes("onClick={handleApproveForExport}")],
    ["no open formal cover letter only cta", !resumePreview.includes("ResumeCoverLetterPanel")],
    ["company research summary shows view edit", companyPanel.includes("View / edit")],
    ["company research summary preview visible when collapsed", companyPanel.includes("summaryPreview")],
    ["edit toggle before developer details", editModeIndex < developerIndex || editModeIndex === Number.POSITIVE_INFINITY],
    ["review center shows revise cover letter action", reviewCenter.includes("Revise cover letter")],
    ["review center fix actions hub", reviewCenter.includes("application-fix-actions")],
    ["review center fix actions before approve", reviewCenter.indexOf("application-fix-actions") < reviewCenter.indexOf("resume-approve-export")],
    ["review center checklists behind disclosure", reviewCenter.includes("review-details-disclosure") && reviewCenter.includes("Review details")],
    ["draft ready status type defined", reviewCenter.includes("DRAFT_READY") || resumePreview.includes("DRAFT_READY") || reviewCenter.includes("exportReady")],
    ["package page header compact", resumePreview.includes("compact") && resumePreview.includes("Fix only if needed")],
    ["package page passes exportReady to review center", resumePreview.includes("exportReady={exportReady}")],
    ["research section conditional on companyContext", resumePreview.includes("companyContext ?") && resumePreview.includes('"application-package-company-research"')],
    ["research section not hardcoded unconditional", !resumePreview.match(/\["Research", "#package-research"\],\s*\["Edit"/)],
    ["package review-first default layout", resumePreview.includes("package-review-default-layout") && resumePreview.includes("package-prominent-preview")],
    ["package fix mode panel gated", resumePreview.includes("package-fix-mode-panel")],
    [
      "layout controls collapsed",
      resumePreview.includes("<details") && resumePreview.includes("Layout controls"),
    ],
    [
      "review center still approves",
      resumePreview.includes("onApproveForExport={() => void handleApproveForExport()}"),
    ],
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
