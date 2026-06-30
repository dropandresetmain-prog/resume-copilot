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
  const outputEditor = readFileSync(
    join(process.cwd(), "src/components/pages/OutputEditorPageClient.tsx"),
    "utf8",
  );
  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
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
    // ── M5b — Evidence Controls + Diagnostics + Fit Summary + Model Tier ─────────
    // M10b — "Bullet controls" disclosure renamed to "Shape next regeneration"
    // (still right-column, line-level, fed into buildMergedControls).
    [
      "output editor has shape-next-regeneration disclosure",
      outputEditor.includes('data-testid="shape-next-regeneration-toggle"'),
    ],
    [
      "output editor shape-next-regeneration labels it as not the current document",
      outputEditor.includes("affects regeneration, not the current document") ||
        outputEditor.includes("Affects regeneration, not the current document"),
    ],
    [
      "output editor shape-next-regeneration stages excluded bullet keys",
      outputEditor.includes("lineLevelExcludedBulletKeys"),
    ],
    [
      "output editor shape-next-regeneration stages forced bullet keys",
      outputEditor.includes("lineLevelForcedBulletKeys"),
    ],
    [
      "output editor shape-next-regeneration feeds into buildMergedControls",
      outputEditor.includes("lineLevelExcludedBulletKeys") &&
        outputEditor.includes("buildMergedControls") &&
        outputEditor.includes("lineLevelForcedBulletKeys"),
    ],
    // M10b — fit summary is now a full-width top banner (not a right-column disclosure),
    // with the numeric score wired via calculateFitScore + fitAssessment.
    [
      "output editor has fit summary top banner",
      outputEditor.includes('data-testid="output-fit-summary-banner"'),
    ],
    [
      "output editor wires numeric fit score",
      outputEditor.includes("calculateFitScore") &&
        outputEditor.includes("fitAssessment") &&
        outputEditor.includes('data-testid="output-fit-score-chip"'),
    ],
    [
      "output editor imports buildPackageFitSummary",
      outputEditor.includes("buildPackageFitSummary"),
    ],
    [
      "output editor has tailoring diagnostics disclosure",
      outputEditor.includes('data-testid="tailoring-diagnostics-toggle"'),
    ],
    [
      "output editor imports buildPackageTailoringDiagnostics",
      outputEditor.includes("buildPackageTailoringDiagnostics"),
    ],
    [
      "output editor tailoring diagnostics shows omitted evidence section",
      outputEditor.includes('data-testid="tailoring-omitted-evidence"'),
    ],
    // ── M10b — Output Editor redesign ────────────────────────────────────────────
    [
      "output editor has Text | PDF dual-view toggle",
      outputEditor.includes('data-testid="document-view-toggle"') &&
        outputEditor.includes("document-view-${seg.key}") &&
        outputEditor.includes("setDocumentView"),
    ],
    [
      "output editor PDF view is on demand (not gated on exportReady)",
      outputEditor.includes('documentView === "pdf" && pdfDocumentModel'),
    ],
    [
      "output editor PDF view shows folio layout sliders",
      outputEditor.includes('data-testid="output-layout-sliders"') &&
        outputEditor.includes("updateLayoutSettings"),
    ],
    [
      "output editor selectable bullets expose Edit / Replace / Remove",
      outputEditor.includes('data-action="bullet-edit"') &&
        outputEditor.includes('data-action="bullet-replace"') &&
        outputEditor.includes('data-action="bullet-remove"'),
    ],
    [
      "output editor Replace picks a spine alternative then tailors via single_bullet (M11)",
      outputEditor.includes("requestResumeSingleBulletRevision") &&
        outputEditor.includes('scope: "single_bullet"') &&
        outputEditor.includes('data-testid="apply-resume-changes"'),
    ],
    [
      "output editor in-document edits use the M5a invalidation path",
      outputEditor.includes("applyContentEdit") &&
        outputEditor.includes("resolveDraftStatusAfterContentEdit"),
    ],
    [
      "output editor export consolidated to bottom card (no topbar export buttons or mark-as-sent)",
      !outputEditor.includes("Mark as sent") &&
        !outputEditor.includes("handleMarkSent"),
    ],
    [
      "output editor CL tab surfaces Other formats (secondary communications)",
      outputEditor.includes("SecondaryCommunicationsPanel"),
    ],
    [
      "generate section embedded mode has resume model tier select",
      generateSection.includes('data-testid="generate-resume-model-tier"'),
    ],
    [
      "generate section embedded mode has cover letter model tier select",
      generateSection.includes('data-testid="generate-cl-model-tier"'),
    ],
    [
      "generate section model tier selects use existing internal state",
      generateSection.includes("resumeModelTier") &&
        generateSection.includes("coverLetterModelTier") &&
        generateSection.includes("setResumeModelTier") &&
        generateSection.includes("setCoverLetterModelTier"),
    ],
    [
      "generate section model tier selects write to storage on change",
      generateSection.includes("writeStoredResumeModelTier") &&
        generateSection.includes("writeStoredCoverLetterModelTier"),
    ],
    // ── M4 — Folio Output Editor trust/delivery surfaces ──────────────────────────
    [
      "output editor has approve-export trust surface",
      outputEditor.includes('data-testid="output-approve-export"'),
    ],
    [
      "output editor approve step precedes export step",
      indexOrInfinity(outputEditor, "Step 1 — Approve") <
        indexOrInfinity(outputEditor, "Step 2 — Export"),
    ],
    [
      "output editor surfaces needs_review banner before approve",
      outputEditor.includes('data-testid="output-needs-review-banner"') &&
        outputEditor.includes("RESUME_DRAFT_STATUS_NEEDS_REVIEW"),
    ],
    [
      "output editor re-approves after layout change",
      outputEditor.includes("isLayoutChangedAfterApprovalStatus") &&
        outputEditor.includes("Re-approve for export"),
    ],
    [
      "output editor distinguishes failed load from missing draft",
      outputEditor.includes("loadFailed") &&
        outputEditor.includes("notFound") &&
        outputEditor.includes('data-testid="output-load-failed"') &&
        outputEditor.includes("Retry loading"),
    ],
    // ── M5c — CL editing, evidence staging, export gates ─────────────────────────
    [
      "CL tab has editable textarea with testid",
      outputEditor.includes('data-testid="cl-edit-textarea"'),
    ],
    [
      "CL tab has edit toggle button",
      outputEditor.includes('data-testid="cl-edit-toggle"'),
    ],
    [
      "CL tab has save cover letter button",
      outputEditor.includes('data-testid="cl-save-button"') &&
        outputEditor.includes("Save cover letter"),
    ],
    [
      "CL tab save button disabled when not dirty",
      outputEditor.includes("isSavingCl || !clIsDirty"),
    ],
    [
      "CL tab has cancel button to discard edits",
      outputEditor.includes('data-testid="cl-edit-cancel"'),
    ],
    [
      "CL tab tracks dirty state against saved body",
      outputEditor.includes("clIsDirty") &&
        outputEditor.includes("body !== coverLetter.body"),
    ],
    [
      "CL tab has beforeunload guard while dirty",
      outputEditor.includes("beforeunload") && outputEditor.includes("clIsDirty"),
    ],
    [
      "CL tab persists via updateGeneratedCoverLetterDraftInCloud",
      outputEditor.includes("handleSaveCoverLetter") &&
        outputEditor.includes("updateGeneratedCoverLetterDraftInCloud"),
    ],
    [
      "CL evidence staging disclosure present",
      outputEditor.includes('data-testid="cl-evidence-staging"') &&
        outputEditor.includes('data-testid="cl-evidence-staging-toggle"'),
    ],
    [
      "CL evidence rows list present",
      outputEditor.includes('data-testid="cl-evidence-rows"'),
    ],
    [
      "CL evidence staging has force and exclude actions",
      outputEditor.includes('data-action="stage-cl-force-evidence"') &&
        outputEditor.includes('data-action="stage-cl-exclude-evidence"'),
    ],
    [
      "CL evidence queue summary shown when controls staged",
      outputEditor.includes('data-testid="cl-evidence-queue-summary"') &&
        outputEditor.includes("hasCoverLetterEvidenceControls"),
    ],
    [
      "CL staged evidence controls passed to regeneration (M11)",
      outputEditor.includes("evidenceControls: normalizeCoverLetterEvidenceControls(stage.evidenceControls)"),
    ],
    [
      "CL staging bucket cleared after apply (M11)",
      outputEditor.includes("setStage(createEmptyCoverLetterStage())"),
    ],
    [
      "CL export gate blocks download on overLimit",
      outputEditor.includes("exportBlocked") &&
        outputEditor.includes("overLimit || bannedPhrases.length > 0"),
    ],
    [
      "CL download buttons gated on exportBlocked",
      outputEditor.includes("disabled={isBusy || !body.trim() || exportBlocked}"),
    ],
    // ── M11: staged (not immediate-AI) chips/tone + custom instruction + apply ──
    [
      "CL quick-action chips are staged, not immediate-AI (M11)",
      outputEditor.includes('data-action="stage-cl-chip"') &&
        outputEditor.includes("function toggleChipAction") &&
        !outputEditor.includes("function applyRevision"),
    ],
    [
      "CL tone is staged via the bucket (M11)",
      outputEditor.includes("function handleSelectTone") &&
        outputEditor.includes("setStage((prev) => ({ ...prev, tone: next }))"),
    ],
    [
      "CL custom instruction input staged (M11)",
      outputEditor.includes('data-testid="cl-custom-instruction"') &&
        outputEditor.includes("customInstruction: e.target.value"),
    ],
    [
      "CL Apply button folds staged changes into one regenerate (M11)",
      outputEditor.includes('data-testid="apply-cover-letter-changes"') &&
        outputEditor.includes("composeCoverLetterInstructions"),
    ],
    [
      "Content gate present: confirm content unlocks layout + approve (M11)",
      outputEditor.includes('data-testid="output-content-gate"') &&
        outputEditor.includes('data-testid="output-confirm-content"') &&
        outputEditor.includes('data-testid="output-layout-locked-note"'),
    ],
    [
      "Approve button gated on contentConfirmed (M11)",
      outputEditor.includes("disabled={isApproving || !contentConfirmed}"),
    ],
    [
      "Content edit re-locks the gate (M11)",
      outputEditor.includes("setContentConfirmed(false)"),
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
