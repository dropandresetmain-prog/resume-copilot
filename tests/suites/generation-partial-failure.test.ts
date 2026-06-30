import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildCoverLetterGenerationOptions } from "../../src/lib/generate/build-cover-letter-options";
import {
  buildArtifactSnapshot,
  classifyCombinedGenerationFailure,
  formatApplicationArtifactSummary,
  getPrimaryRetryAction,
  resumePersistedBeforeCoverLetterFailure,
  shouldSkipResumeGenerationOnCoverLetterRetry,
} from "../../src/lib/generate/generation-artifact-status";
import { RESUME_DRAFT_SCHEMA_VERSION } from "../../src/types/resume-draft";
import type { GeneratedResumeDraftRecord } from "../../src/types/resume-draft";
import { createJobDescriptionFromInput } from "../../src/lib/jd/persistence";

function buildSampleResumeDraft(): GeneratedResumeDraftRecord {
  return {
    id: "resume-draft-abc",
    userId: "user-1",
    jobDescriptionId: "jd-1",
    applicationId: "app-1",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: "Product Manager",
      header: { includeHeader: true, fullName: "Alex Tan" },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      experience: [],
      education: [],
      additionalExperience: [],
      skills: { groups: [], jdAlignment: [], riskFlags: [] },
      globalRiskFlags: [],
    },
    status: "generated",
    schemaVersion: "1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function main() {
  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const resumePanel = readFileSync(
    join(process.cwd(), "src/components/cover-letters/ResumeCoverLetterPanel.tsx"),
    "utf8",
  );
  const recordsPanel = readFileSync(
    join(process.cwd(), "src/components/setup/ApplicationRecordsPanel.tsx"),
    "utf8",
  );
  const outputEditor = readFileSync(
    join(process.cwd(), "src/components/pages/OutputEditorPageClient.tsx"),
    "utf8",
  );

  const resumeDraft = buildSampleResumeDraft();
  const job = createJobDescriptionFromInput({
    rawText: "Product Manager at Pave Bank",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const coverOptions = buildCoverLetterGenerationOptions({
    job,
    resumeDraft,
    applicationId: "app-1",
    fields: {
      country: "Singapore",
    },
  });

  const partialFailureSnapshot = buildArtifactSnapshot({
    resumeStatus: "success",
    coverLetterStatus: "failed",
  });
  const failureKind = classifyCombinedGenerationFailure(partialFailureSnapshot);
  const retryAction = getPrimaryRetryAction(failureKind);
  const artifactSummary = formatApplicationArtifactSummary({
    hasResume: true,
    hasCoverLetter: false,
  });

  const checks: [string, boolean][] = [
    [
      "resume success + cover letter failure classified",
      failureKind === "cover_letter_failed_after_resume_success",
    ],
    ["primary retry action is cover letter", retryAction === "retry_cover_letter"],
    [
      "resume persisted before cover letter retry",
      resumePersistedBeforeCoverLetterFailure(resumeDraft.id),
    ],
    [
      "cover letter retry skips resume generation",
      shouldSkipResumeGenerationOnCoverLetterRetry(resumeDraft.id),
    ],
    [
      "cover letter retry reuses resume draft id",
      coverOptions.resumeDraft.id === resumeDraft.id,
    ],
    ["cover letter retry reuses job id", coverOptions.job.id === job.id],
    [
      "generate section persists resume before cover letter",
      generateSection.indexOf("markApplicationResumeGenerated") <
        generateSection.indexOf("runCoverLetterGeneration"),
    ],
    [
      "generate section has separate cover letter catch",
      generateSection.includes("catch (coverLetterError)"),
    ],
    ["generate section shows resume success message", generateSection.includes("Resume generated successfully")],
    ["generate section offers retry cover letter", generateSection.includes("Retry Cover Letter")],
    [
      "generate section does not tie cover letter failure to resume retry only",
      generateSection.includes("handleRetryCoverLetter"),
    ],
    [
      "retry cover letter does not call resume generation api",
      !generateSection.includes("handleRetryCoverLetter") ||
        (generateSection.includes("handleRetryCoverLetter") &&
          !generateSection
            .slice(
              generateSection.indexOf("async function handleRetryCoverLetter"),
              generateSection.indexOf("async function handleRetryCoverLetter") + 1200,
            )
            .includes("requestResumeDraftGeneration")),
    ],
    [
      "retry cover letter does not create duplicate resume draft",
      !generateSection
        .slice(
          generateSection.indexOf("async function handleRetryCoverLetter"),
          generateSection.indexOf("const failureKind"),
        )
        .includes("createGeneratedResumeDraftInCloud"),
    ],
    [
      "cover letter retry returns to output with the saved resume draft",
      generateSection
        .slice(
          generateSection.indexOf("async function handleRetryCoverLetter"),
          generateSection.indexOf("async function handleRegenerateResumeWithConfirm"),
        )
        .includes("router.push(`/output/${partialCoverLetterFailure.resumeDraft.id}`)"),
    ],
    [
      "output direct load uses persisted resume application and cover letter records",
      outputEditor.includes("getGeneratedResumeDraftFromCloud(draftId)") &&
        outputEditor.includes("getApplicationRecordFromCloud(record.applicationId)") &&
        outputEditor.includes("findCoverLetterDraftByResumeDraftId(resumeDraft.id)"),
    ],
    [
      "output represents a confirmed missing cover letter without crashing",
      outputEditor.includes("No cover letter has been generated for this application yet.") &&
        outputEditor.includes("Generate cover letter"),
    ],
    [
      "output does not treat a failed cover letter lookup as confirmed missing",
      outputEditor.includes("loadError") &&
        outputEditor.includes("We could not verify whether a cover letter is already saved.") &&
        outputEditor.includes("No new draft was created.") &&
        outputEditor.includes("Retry loading"),
    ],
    ["resume preview panel offers retry cover letter", resumePanel.includes("Retry Cover Letter")],
    [
      "records page shows resume and cover letter status",
      recordsPanel.includes("formatApplicationArtifactSummary"),
    ],
    [
      "records page links to application package when cover letter missing",
      recordsPanel.includes("Open package"),
    ],
    ["records cover letter missing shows cross", artifactSummary.coverLetterLabel === "✗"],
    ["records resume present shows check", artifactSummary.resumeLabel === "✓"],
    [
      "resume-only failure still offers regenerate resume",
      getPrimaryRetryAction(
        classifyCombinedGenerationFailure(
          buildArtifactSnapshot({
            resumeStatus: "failed",
            coverLetterStatus: "pending",
          }),
        ),
      ) === "regenerate_resume",
    ],
    [
      "partial failure regenerate resume requires confirmation",
      generateSection.includes("handleRegenerateResumeWithConfirm") &&
        generateSection.includes("This replaces your resume draft"),
    ],
    [
      "partial failure regenerate resume demoted to link style",
      generateSection.includes('data-action="regenerate-resume-after-partial-failure"') &&
        generateSection.includes("underline"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll generation partial-failure checks passed.");
}

main();
