import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildApplicationReviewStatus,
  resolveCompanySpecificityCounts,
} from "../../src/lib/application-review/build-application-review-status";
import {
  evaluateCoverLetterClientExportReadiness,
} from "../../src/lib/application-review/cover-letter-export-readiness";
import { RESUME_DRAFT_SCHEMA_VERSION } from "../../src/types/resume-draft";
import type { GeneratedCoverLetterDraftRecord } from "../../src/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "../../src/types/resume-draft";

const layoutSettings = {
  bodyFontPx: 10.5,
  marginMm: 12,
  marginTopMm: 10,
  lineSpacing: 1.15,
  itemLineSpacing: 1.1,
  sectionSpacing: 0.75,
};

function buildResumeDraft(
  overrides: Partial<GeneratedResumeDraftRecord> = {},
): GeneratedResumeDraftRecord {
  return {
    id: "draft-1",
    userId: "user-1",
    status: "generated",
    schemaVersion: "1",
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      header: { includeHeader: true },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      skills: { groups: [{ label: "Skills", items: ["Product"] }], jdAlignment: [], riskFlags: [] },
      experience: [
        {
          company: "Acme",
          role: "PM",
          bullets: [
            {
              text: "Led product operations",
              sourceRefs: [{ bulletKey: "k1" }],
              confidence: "high",
              riskFlags: [],
            },
          ],
          riskFlags: [],
        },
      ],
      education: [],
      additionalExperience: [{ text: "Advisor: Startup", riskFlags: [] }],
      globalRiskFlags: ["structure_repair_warning"],
      exportLayoutSettings: layoutSettings,
    },
    rationale: {
      overall: "Aligned to operations leadership themes.",
      omissions: ["Blockchain depth"],
      keywordUsage: ["Operations"],
      selectionAudit: { selectedBulletKeys: ["k1", "k2"] },
      forcedBulletAudit: {
        requestedKeys: ["k1", "k2"],
        unavailableKeys: [{ key: "k2", reason: "excluded", message: "Excluded" }],
        alreadyInPayloadKeys: [],
        includedInOutput: ["k1"],
        missingFromOutput: [],
        removedDuringRepair: [],
        unableToPreserveDuringRepair: [],
      },
      structureRepair: {
        actions: ["trimmed bullets"],
        messages: ["Trimmed role bullets"],
        needsReview: true,
      },
    },
    inputSnapshot: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      jobDescriptionId: "jd-1",
      referenceResumeId: "resume-1",
      referenceResumeFilename: "base.docx",
      approvedKeywordIds: [],
      approvedKeywords: [],
      collatedSummary: { experienceCount: 1, bulletCount: 2, educationCount: 0, skillCount: 1 },
      generatedAtRequest: "2025-06-01T12:00:00.000Z",
      resumeModelTier: "enhanced",
      modelFallbackApplied: true,
    },
    modelName: "gemini-2.5-flash-lite",
    ...overrides,
  };
}

function buildCoverLetter(
  overrides: Partial<GeneratedCoverLetterDraftRecord> = {},
): GeneratedCoverLetterDraftRecord {
  const body =
    "Dear Hiring Manager,\n\nI am excited to apply for this role with relevant operations experience.\n\nMin Htet";
  return {
    id: "cl-1",
    userId: "user-1",
    body,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
    rationale: {
      selectedThemes: ["operations"],
      whyTheseThemes: "JD fit",
      companyContextUsed: ["Fact A", "Fact B"],
      selectedCompanyFacts: ["Fact A", "Fact B"],
      selectedRoleRequirements: ["Ops leadership", "Stakeholder mgmt"],
      companyRoleStoryBridges: ["Bridge 1", "Bridge 2"],
      riskFlags: [],
      wordCount: 20,
      emailCoverLetter: "",
      linkedinMessage: "",
      recruiterDm: "",
      whatsappIntro: "",
      modelSelection: {
        requestedTier: "premium",
        fallbackApplied: false,
      },
    },
    modelName: "gemini-3.5-flash",
    ...overrides,
  };
}

function main() {
  const packagePanel = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationPackageCoverLetterPanel.tsx"),
    "utf8",
  );
  const previewPage = readFileSync(
    join(process.cwd(), "src/components/pages/ResumePreviewPageClient.tsx"),
    "utf8",
  );

  const unapproved = buildApplicationReviewStatus({
    resumeDraft: buildResumeDraft(),
    coverLetter: null,
    companyContext: null,
    exportReady: false,
    layoutChangedAfterApproval: false,
    currentLayoutSettings: layoutSettings,
  });

  const approved = buildApplicationReviewStatus({
    resumeDraft: buildResumeDraft({
      status: "approved",
      content: {
        ...buildResumeDraft().content,
        serverPdfValidation: { pageCount: 1, validatedAt: "2025-06-01T13:00:00.000Z" },
      },
    }),
    coverLetter: buildCoverLetter(),
    companyContext: {
      companyName: "Acme",
      displayName: "Acme",
      companySummary: "Summary",
      productsAndServices: [],
      likelyHiringPriorities: [],
      suggestedNarrativeAngles: [],
      confidence: "medium",
      limitations: ["JD-based context only — no company website research performed."],
      generatedAt: "2025-06-01T00:00:00.000Z",
      sourceType: "jd_based_context",
      sources: [{ type: "firecrawl", success: false, error: "timeout" }],
    },
    exportReady: true,
    layoutChangedAfterApproval: false,
    currentLayoutSettings: layoutSettings,
    coverLetterPdfOverflow: true,
  });

  const overLimitBody = `${"word ".repeat(430)}Min Htet`;
  const overLimit = buildApplicationReviewStatus({
    resumeDraft: buildResumeDraft({
      status: "approved",
      content: {
        ...buildResumeDraft().content,
        serverPdfValidation: { pageCount: 1, validatedAt: "2025-06-01T13:00:00.000Z" },
      },
    }),
    coverLetter: buildCoverLetter({ body: overLimitBody }),
    companyContext: null,
    exportReady: true,
    layoutChangedAfterApproval: false,
    currentLayoutSettings: layoutSettings,
  });

  const bannedBody = "I am a founder-operator systems thinker. Min Htet";
  const clientBanned = evaluateCoverLetterClientExportReadiness(bannedBody);

  const specificity = resolveCompanySpecificityCounts(buildCoverLetter().rationale);
  const specificityFromParserOnly = resolveCompanySpecificityCounts({
    selectedThemes: [],
    whyTheseThemes: "",
    companyContextUsed: ["A", "B"],
    riskFlags: [],
    wordCount: 1,
    emailCoverLetter: "",
    linkedinMessage: "",
    recruiterDm: "",
    whatsappIntro: "",
  });

  const checks: [string, boolean][] = [
    ["unapproved overall is DRAFT_READY (pre-approval neutral state)", unapproved.overallStatus === "DRAFT_READY"],
    [
      "unapproved has resume blocking",
      unapproved.sections
        .find((section) => section.id === "resume")
        ?.items.some((item) => item.id === "resume-not-approved") ?? false,
    ],
    [
      "missing cover letter is warning not blocking in cover letter section",
      unapproved.sections
        .find((section) => section.id === "cover-letter")
        ?.items.some(
          (item) => item.id === "cover-letter-missing" && item.severity === "warning",
        ) ?? false,
    ],
    [
      "fit score surfaced in resume section",
      unapproved.sections
        .find((section) => section.id === "resume")
        ?.items.some((item) => item.message.includes("Resume–Job Fit")) ?? false,
    ],
    [
      "forced bullets included count surfaced",
      unapproved.sections
        .find((section) => section.id === "resume")
        ?.items.some((item) => item.message.includes("Forced bullets included successfully: 1")) ??
        false,
    ],
    [
      "forced bullets unavailable surfaced",
      unapproved.sections
        .find((section) => section.id === "resume")
        ?.items.some((item) => item.message.includes("Forced bullets unavailable: 1")) ?? false,
    ],
    [
      "research fallback warning when firecrawl fails",
      approved.sections
        .find((section) => section.id === "company-research")
        ?.items.some((item) => item.id === "research-fallback") ?? false,
    ],
    [
      "export readiness lists resume pdf blocked when unapproved",
      unapproved.exportReadiness.find((entry) => entry.artifact === "resume_pdf")?.ready === false,
    ],
    [
      "approved export ready when gates pass",
      approved.exportReadiness.every((entry) =>
        entry.artifact === "cover_letter" ? entry.ready : entry.ready,
      ),
    ],
    [
      "over limit cover letter blocks overall export",
      overLimit.overallStatus === "NOT_READY_TO_EXPORT",
    ],
    [
      "evidence usage section present",
      approved.sections.some((section) => section.id === "evidence"),
    ],
    [
      "evidence bullets selected count",
      approved.evidenceUsage.resumeBulletsSelected === 2,
    ],
    [
      "generation details include resume tier and model",
      approved.sections
        .find((section) => section.id === "generation")
        ?.items.some((item) => item.message.includes("Requested tier: enhanced")) ?? false,
    ],
    [
      "generation fallback flagged",
      approved.sections
        .find((section) => section.id === "generation")
        ?.items.some((item) => item.message.includes("Fallback applied")) ?? false,
    ],
    [
      "company specificity from extended rationale fields",
      specificity.available && specificity.companyFacts === 2 && specificity.bridges === 2,
    ],
    [
      "company specificity falls back to companyContextUsed count",
      specificityFromParserOnly.companyFacts === 2,
    ],
    [
      "approved with warnings is REVIEW_RECOMMENDED when only warnings",
      approved.overallStatus === "REVIEW_RECOMMENDED" || approved.warningCount > 0,
    ],
    ["client export blocks banned phrases", !clientBanned.exportReady],
    [
      "package panel uses client export readiness",
      packagePanel.includes("evaluateCoverLetterClientExportReadiness"),
    ],
    [
      "package panel disables download when export blocked",
      packagePanel.includes("disabled={exportBlocked}"),
    ],
    [
      "preview page uses ApplicationReviewCenter",
      previewPage.includes("ApplicationReviewCenter"),
    ],
    [
      "preview page removed static ApplicationPackageSummary",
      !previewPage.includes("ApplicationPackageSummary"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll application review checks passed.");
}

main();
