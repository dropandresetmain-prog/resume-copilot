import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  applyReviewStateToContent,
  createInitialReviewState,
  reviewStateDiffersFromSavedContent,
  updateExperienceBulletReview,
} from "../../src/lib/resume-draft/review-state";
import type { ResumeDraftContent } from "../../src/types/resume-draft";

function buildSampleContent(): ResumeDraftContent {
  return {
    targetRoleTitle: "Product Manager",
    header: { fullName: "Alex Tan" },
    professionalSummary: { text: "Summary text" },
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
            sourceRefs: [],
          },
        ],
      },
    ],
    education: [],
    additionalExperience: [],
    skills: { groups: [] },
    interests: { items: [] },
  };
}

function main() {
  const reviewWorkspace = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeDraftReviewWorkspace.tsx"),
    "utf8",
  );
  const bulletCard = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeDraftBulletCard.tsx"),
    "utf8",
  );
  const reviewCenter = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationReviewCenter.tsx"),
    "utf8",
  );
  const coverLetterPage = readFileSync(
    join(process.cwd(), "src/components/pages/CoverLetterPreviewPageClient.tsx"),
    "utf8",
  );
  const revisionPanel = readFileSync(
    join(process.cwd(), "src/components/cover-letters/CoverLetterQuickRevisionPanel.tsx"),
    "utf8",
  );
  const evidencePanel = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx"),
    "utf8",
  );
  const resumePreview = readFileSync(
    join(process.cwd(), "src/components/pages/ResumePreviewPageClient.tsx"),
    "utf8",
  );

  const content = buildSampleContent();
  const baseState = createInitialReviewState(content);
  const editedState = updateExperienceBulletReview(baseState, 0, 0, {
    status: "edited",
    editedText: "Led major product launches",
  });

  const checks: [string, boolean][] = [
    [
      "resume save cta is save resume edits",
      reviewWorkspace.includes("Save resume edits") &&
        !reviewWorkspace.includes("Mark as reviewed"),
    ],
    [
      "resume dirty state visible",
      reviewWorkspace.includes('data-testid="resume-edit-save-status"') &&
        reviewWorkspace.includes("Unsaved changes"),
    ],
    [
      "resume leave warning via beforeunload",
      reviewWorkspace.includes("beforeunload"),
    ],
    [
      "bullet card clarifies local edit",
      bulletCard.includes("Apply local edit") &&
        bulletCard.includes("Save resume edits"),
    ],
    [
      "review state dirty helper works",
      reviewStateDiffersFromSavedContent(content, editedState),
    ],
    [
      "review state clean when unchanged",
      !reviewStateDiffersFromSavedContent(content, baseState),
    ],
    [
      "save applies review overlay",
      applyReviewStateToContent(content, editedState, { includePending: true })
        .experience[0]?.bullets[0]?.text === "Led major product launches",
    ],
    [
      "package fix actions exposed",
      reviewCenter.includes('data-testid="application-fix-actions"') &&
        reviewCenter.includes("Fix resume text") &&
        reviewCenter.includes("Fix evidence") &&
        reviewCenter.includes("Fix cover letter") &&
        reviewCenter.includes("Adjust layout"),
    ],
    [
      "fix actions before approve export",
      reviewCenter.indexOf("application-fix-actions") <
        reviewCenter.indexOf("resume-approve-export"),
    ],
    [
      "cover letter manual edit section",
      coverLetterPage.includes('data-testid="cover-letter-manual-edit"') &&
        coverLetterPage.includes("Manual edit"),
    ],
    [
      "cover letter ai revision section",
      coverLetterPage.includes("AI revisions save immediately") &&
        revisionPanel.includes("AI revision"),
    ],
    [
      "manual save not primary without changes",
      coverLetterPage.includes("hasUnsavedBodyChanges ? primaryButtonClassName : secondaryButtonClassName"),
    ],
    [
      "cover letter manual save status",
      coverLetterPage.includes('data-testid="cover-letter-manual-save-status"'),
    ],
    [
      "evidence include exclude copy",
      evidencePanel.includes("Include this evidence") &&
        evidencePanel.includes("Exclude this evidence"),
    ],
    [
      "evidence rewrite shows role count when available",
      evidencePanel.includes("affectedRoleCount") &&
        evidencePanel.includes("Rewrite ${affectedRoleCount}"),
    ],
    [
      "evidence full regenerate scope copy",
      evidencePanel.includes("rebuilds the entire resume"),
    ],
    [
      "package opens evidence on hash",
      resumePreview.includes('#package-edit') && resumePreview.includes("setShowEditResumeContent(true)"),
    ],
    [
      "layout controls anchor exists",
      resumePreview.includes('id="package-layout-controls"'),
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
