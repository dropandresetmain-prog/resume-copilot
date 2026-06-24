import { readFileSync } from "node:fs";
import { join } from "node:path";

import { coverLetterRevisionShouldPersist } from "../../src/lib/cover-letter/revision-client";
import type { ResumeDraftContent } from "../../src/types/resume-draft";
import {
  buildEvidenceQueueSummary,
  collectGeneratedBulletsWithKeys,
} from "../../src/lib/resume-draft/evidence-pending-queue";
import {
  removeBulletsFromDraftBySourceKeys,
  resolveDraftStatusAfterContentEdit,
} from "../../src/lib/resume-draft/apply-evidence-changes";
import { buildPackageFitSummary, PACKAGE_FIT_SUMMARY_MAX_WORDS } from "../../src/lib/package/fit-summary";
import { PREVIEW_FIT_HEURISTIC_VERSION } from "../../src/lib/resume-draft/layout";

function buildSampleContent(): ResumeDraftContent {
  return {
    targetRoleTitle: "Product Manager",
    header: { fullName: "Alex Tan", includeHeader: true },
    professionalSummary: { text: "Summary text", jdAlignment: [], riskFlags: [] },
    experience: [
      {
        company: "Acme",
        role: "PM",
        dateRange: "2020 - Present",
        location: "",
        bullets: [
          {
            text: "Led product launches",
            confidence: "high",
            riskFlags: [],
            sourceRefs: [{ bulletKey: "acme-1", collatedBulletId: "acme-1" }],
          },
        ],
      },
    ],
    education: [],
    additionalExperience: [],
    skills: { groups: [], jdAlignment: [], riskFlags: [] },
    interests: { items: [] },
    globalRiskFlags: [],
  };
}

function main() {
  const reviewCenter = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationReviewCenter.tsx"),
    "utf8",
  );
  const decisionTree = readFileSync(
    join(process.cwd(), "src/components/application-package/PackageDecisionTree.tsx"),
    "utf8",
  );
  const reviewWorkspace = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeDraftReviewWorkspace.tsx"),
    "utf8",
  );
  const evidencePanel = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx"),
    "utf8",
  );
  const stagedRevision = readFileSync(
    join(process.cwd(), "src/components/cover-letters/CoverLetterStagedRevisionPanel.tsx"),
    "utf8",
  );
  const revisionRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/revise-cover-letter/route.ts"),
    "utf8",
  );
  const resumePreview = readFileSync(
    join(process.cwd(), "src/components/pages/ResumePreviewPageClient.tsx"),
    "utf8",
  );
  const fitSummary = readFileSync(
    join(process.cwd(), "src/lib/package/fit-summary.ts"),
    "utf8",
  );

  const content = buildSampleContent();
  const queueSummary = buildEvidenceQueueSummary(
    [
      {
        id: "remove:acme-1",
        type: "remove_from_draft",
        bulletKey: "acme-1",
        label: "Led product launches",
      },
      {
        id: "add:new-1",
        type: "add_to_draft",
        bulletKey: "new-1",
        label: "New evidence",
      },
    ],
    1,
  );

  const removed = removeBulletsFromDraftBySourceKeys(content, ["acme-1"]);
  const fitText = buildPackageFitSummary({
    rationale: { overall: "Strong PM fit for growth stage teams.", toneNotes: "", keywordUsage: [], omissions: [] },
    fitAssessment: {
      fitScore: 82,
      heuristicVersion: PREVIEW_FIT_HEURISTIC_VERSION,
      optimizedFor: ["one-page"],
      scoreRationale: "Strong match",
      keyStrengths: ["Product leadership"],
      riskFlags: [],
    },
  });

  const checks: [string, boolean][] = [
    ["decision tree component exists", decisionTree.includes('data-testid="package-decision-tree"')],
    [
      "decision tree actions",
      decisionTree.includes("Edit resume text") &&
        decisionTree.includes("Fix resume evidence") &&
        decisionTree.includes("Adjust resume layout") &&
        decisionTree.includes("Revise cover letter") &&
        decisionTree.includes("Approve for export"),
    ],
    [
      "review center mounts decision tree",
      reviewCenter.includes("PackageDecisionTree"),
    ],
    [
      "package fix actions use new labels",
      reviewCenter.includes("Edit resume text") &&
        reviewCenter.includes("Fix resume evidence") &&
        reviewCenter.includes("Adjust resume layout") &&
        reviewCenter.includes("Revise cover letter"),
    ],
    [
      "readiness checklist label",
      reviewCenter.includes("Readiness checklist"),
    ],
    [
      "structured editor on package page",
      resumePreview.includes("ResumeDraftReviewWorkspace") &&
        resumePreview.includes("packageMode"),
    ],
    [
      "edit resume hidden until fix mode",
      resumePreview.includes('activeFixMode === "edit-resume"') &&
        resumePreview.includes('data-testid="package-fix-mode-edit-resume"'),
    ],
    [
      "review-first default layout",
      resumePreview.includes('data-testid="package-review-default-layout"') &&
        resumePreview.includes('data-package-view={activeFixMode ?? "review"}'),
    ],
    [
      "fit summary before review rail",
      resumePreview.indexOf('data-testid="package-fit-summary-top"') <
        resumePreview.indexOf('data-testid="package-review-rail"'),
    ],
    [
      "prominent preview in default view",
      resumePreview.includes('data-testid="package-prominent-preview"') &&
        resumePreview.includes('data-testid="package-default-preview"'),
    ],
    [
      "fix modes opened via callbacks",
      resumePreview.includes("onFixAction={openFixMode}") &&
        decisionTree.includes("onSelectMode"),
    ],
    [
      "back to review action",
      resumePreview.includes('data-action="back-to-package-review"'),
    ],
    [
      "single fix mode at a time",
      resumePreview.includes("activeFixMode === null") &&
        resumePreview.includes('data-testid="package-fix-mode-panel"'),
    ],
    [
      "save resume edits action",
      reviewWorkspace.includes('data-action="save-resume-edits"') &&
        reviewWorkspace.includes("Save resume edits"),
    ],
    [
      "structured sections test id",
      reviewWorkspace.includes('data-testid="resume-structured-sections"'),
    ],
    [
      "header contact fields",
      reviewWorkspace.includes("Header / contact"),
    ],
    [
      "content edit downgrades approval",
      reviewWorkspace.includes("resolveDraftStatusAfterContentEdit"),
    ],
    [
      "evidence queue summary",
      evidencePanel.includes('data-testid="evidence-queue-summary"') &&
        evidencePanel.includes("Apply evidence changes"),
    ],
    [
      "evidence staging not immediate gemini",
      evidencePanel.includes("stage-remove-from-draft") &&
        evidencePanel.includes("stage-add-to-draft") &&
        !evidencePanel.includes("onChange={() => {\n                          if (primaryKey)"),
    ],
    [
      "queue summary helper",
      queueSummary.removeCount === 1 &&
        queueSummary.addCount === 1 &&
        queueSummary.summaryLines.some((line) => line.includes("rewrite 1 affected role")),
    ],
    [
      "local bullet removal",
      removed.experience[0]?.bullets.length === 0,
    ],
    [
      "status downgrade helper",
      resolveDraftStatusAfterContentEdit("approved") === "layout_changed",
    ],
    [
      "cover letter staged revision chips",
      stagedRevision.includes('data-testid="cover-letter-revision-chips"') &&
        stagedRevision.includes('data-action="revise-cover-letter"'),
    ],
    [
      "cover letter accept reject preview",
      stagedRevision.includes("Accept revision") &&
        stagedRevision.includes("Reject / keep current") &&
        stagedRevision.includes('data-testid="cover-letter-revision-preview"'),
    ],
    [
      "chips do not call gemini on click",
      stagedRevision.includes("Chips stage instructions only") &&
        !stagedRevision.includes("onClick={() => void runRevision"),
    ],
    [
      "revise requests candidate without persist",
      stagedRevision.includes("persist: false") &&
        stagedRevision.includes("response.persisted"),
    ],
    [
      "revision route supports candidate mode",
      revisionRoute.includes("coverLetterRevisionShouldPersist") &&
        coverLetterRevisionShouldPersist({ persist: false }) === false,
    ],
    [
      "accept persists via parent callback only",
      stagedRevision.includes("await onAccepted") &&
        resumePreview.includes("onAccepted={async") &&
        resumePreview.includes("updateGeneratedCoverLetterDraftInCloud"),
    ],
    [
      "reject discards preview only",
      stagedRevision.includes("handleRejectRevision") &&
        stagedRevision.includes("setPendingRevision(null)") &&
        !stagedRevision.includes("updateGeneratedCoverLetterDraftInCloud"),
    ],
    [
      "revise is sole revision client call in panel",
      stagedRevision.includes("handleReviseCoverLetter") &&
        stagedRevision.includes("requestCoverLetterRevision") &&
        stagedRevision.includes("toggleChip"),
    ],
    [
      "fit summary panel on package",
      resumePreview.includes("PackageFitSummaryPanel"),
    ],
    [
      "fit summary derived not page load ai",
      fitSummary.includes("no page-load AI") || fitSummary.includes("no page-load AI call"),
    ],
    [
      "fit summary truncates",
      fitText !== null && fitText.split(/\s+/).length <= PACKAGE_FIT_SUMMARY_MAX_WORDS,
    ],
    [
      "fit summary max words constant",
      PACKAGE_FIT_SUMMARY_MAX_WORDS === 100,
    ],
    [
      "fit summary clamps long rationale",
      (() => {
        const long = buildPackageFitSummary({
          rationale: {
            overall: Array.from({ length: 120 }, (_, index) => `word${index}`).join(" "),
            toneNotes: "",
            keywordUsage: [],
            omissions: [],
          },
          fitAssessment: null,
        });
        return long !== null && long.split(/\s+/).length <= PACKAGE_FIT_SUMMARY_MAX_WORDS;
      })(),
    ],
    [
      "generated bullets with keys helper",
      collectGeneratedBulletsWithKeys(content)[0]?.sourceKeys[0] === "acme-1",
    ],
    [
      "preview export mismatch banner",
      resumePreview.includes('data-testid="preview-export-mismatch"'),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll post-generation edit workflow checks passed.");
}

main();
