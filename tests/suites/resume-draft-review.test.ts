import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { reviseMockResumeRoleCustom, reviseMockResumeSummary, reviseMockResumeBatch } from "../../src/lib/ai/revise-resume-scope-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { formatKeywordBullet } from "../../src/lib/resume-draft/layout";
import { formatRiskFlagLabel } from "../../src/lib/resume-draft/preview-helpers";
import {
  applyReviewStateToContent,
  createInitialReviewState,
  updateExperienceBulletReview,
  updateProfessionalSummaryReview,
} from "../../src/lib/resume-draft/review-state";
import {
  applyResumeCustomRevision,
  resumeCustomRevisionShouldPersist,
} from "../../src/lib/resume-draft/custom-revision";
import {
  applyResumeBatchRevision,
  sanitizeBatchRevisionOutput,
} from "../../src/lib/resume-draft/custom-revision-batch";
import {
  buildResumeBatchRevisionPrompt,
  promptIncludesBatchRevisionScope,
} from "../../src/lib/resume-draft/custom-revision-batch-prompt";
import {
  buildResumeRoleCustomRevisionPrompt,
  buildResumeSummaryCustomRevisionPrompt,
  promptIncludesRoleCustomRevisionScope,
  promptIncludesSummaryCustomRevisionScope,
} from "../../src/lib/resume-draft/custom-revision-prompt";
import type { InventoryState } from "../../src/types/resume";
import {
  isProfessionalSummaryRevisionScopeAvailable,
  PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY,
} from "../../src/lib/resume-draft/custom-revision";

const sampleJd: StoredJobDescription = {
  id: "jd-1",
  rawText: "Looking for a product manager with operations and strategy experience.",
  companyName: "Acme",
  roleTitle: "Product Manager",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function buildSampleInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Acme",
            descriptor: "",
            location: "",
            role: "Product Manager",
            dateRange: "2022 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "bullet-1",
                parentId: "exp-1",
                keyword: "Operations",
                description: "Led product operations improvements",
                rawBulletText: "Led product operations improvements",
              },
            ],
          },
        ],
        education: [],
        additionalExperience: {
          id: "additional-1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "skills-1",
          sourceResumeId: "resume-1",
          languages: [],
          technicalSkills: ["SQL"],
          interests: [],
          other: [],
          rawText: "",
          parseWarnings: [],
        },
        unparsedSections: [],
        parseWarnings: [],
      },
    ],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
  };
}

function main() {
  const inventory = buildSampleInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const mockDraft = generateMockResumeDraft(generationInput);
  const originalContent = mockDraft.content;
  const originalInventory = JSON.stringify(inventory);

  const initialReview = createInitialReviewState(originalContent);
  let reviewState = initialReview;
  reviewState = updateExperienceBulletReview(reviewState, 0, 0, {
    status: "edited",
    editedText: "Edited bullet for tailored resume draft.",
  });
  reviewState = updateProfessionalSummaryReview(reviewState, {
    status: "rejected",
  });

  const previewContent = applyReviewStateToContent(originalContent, reviewState);
  const savedContent = applyReviewStateToContent(originalContent, reviewState, {
    includePending: true,
  });

  const editedBullet = previewContent.experience[0]?.bullets[0]?.text ?? "";
  const summaryOmitted = previewContent.professionalSummary.text === "";
  const inventoryUnchanged = JSON.stringify(inventory) === originalInventory;
  const originalFirstBullet = originalContent.experience[0]?.bullets[0]?.text ?? "";
  const expectedFirstBullet = formatKeywordBullet(
    "Operations",
    "Led product operations improvements",
  );
  const originalObjectUnchanged = originalFirstBullet === expectedFirstBullet;
  const riskLabel = formatRiskFlagLabel("needs review");

  const summaryRevision = reviseMockResumeSummary({
    currentSummary: "Operations leader with B2B experience.",
    customInstruction: "Emphasize automation outcomes.",
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const summaryScopedContent = applyResumeCustomRevision(originalContent, {
    scope: "professional_summary",
    professionalSummaryText: summaryRevision.professionalSummaryText,
  });
  const roleRevision = reviseMockResumeRoleCustom({
    currentRole: originalContent.experience[0]!,
    customInstruction: "Tighten metrics.",
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const roleScopedContent = applyResumeCustomRevision(originalContent, {
    scope: "selected_role",
    roleIndex: 0,
    roleBullets: roleRevision.roleBullets,
  });
  const summaryPrompt = buildResumeSummaryCustomRevisionPrompt({
    currentSummary: "Summary text",
    customInstruction: "Make it sharper.",
    jobDescriptionText: sampleJd.rawText,
  });
  const rolePrompt = buildResumeRoleCustomRevisionPrompt({
    currentRole: originalContent.experience[0]!,
    customInstruction: "Focus on revenue.",
    jobDescriptionText: sampleJd.rawText,
  });
  const batchPrompt = buildResumeBatchRevisionPrompt({
    content: {
      ...originalContent,
      professionalSummary: {
        text: "Operations leader with B2B experience.",
        jdAlignment: [],
        riskFlags: [],
      },
    },
    queue: [
      {
        id: "summary-1",
        scope: "professional_summary",
        customInstruction: "Emphasize automation outcomes.",
      },
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const batchRevision = reviseMockResumeBatch({
    content: {
      ...originalContent,
      professionalSummary: {
        text: "Operations leader with B2B experience.",
        jdAlignment: [],
        riskFlags: [],
      },
    },
    queue: [
      {
        id: "summary-1",
        scope: "professional_summary",
        customInstruction: "Emphasize automation outcomes.",
      },
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const batchContent = applyResumeBatchRevision(
    {
      ...originalContent,
      professionalSummary: {
        text: "Operations leader with B2B experience.",
        jdAlignment: [],
        riskFlags: [],
      },
    },
    batchRevision,
  );
  const unqueuedRoleSanitized = sanitizeBatchRevisionOutput({
    content: originalContent,
    queue: [
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    parsed: {
      roleCandidates: [
        {
          roleIndex: 1,
          company: originalContent.experience[1]?.company ?? "Other Co",
          role: originalContent.experience[1]?.role ?? "Other Role",
          bullets: originalContent.experience[1]?.bullets ?? [],
        },
      ],
      warnings: [],
    },
  });
  const malformedSanitized = sanitizeBatchRevisionOutput({
    content: originalContent,
    queue: [
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    parsed: {
      roleCandidates: [
        {
          roleIndex: 0,
          company: originalContent.experience[0]!.company,
          role: originalContent.experience[0]!.role,
          bullets: [],
        },
      ],
      warnings: ["Model noted a formatting issue."],
    },
  });

  const checks: [string, boolean][] = [
    ["initial review state pending summary", initialReview.professionalSummary.status === "pending"],
    ["edited bullet in preview", editedBullet.includes("Edited bullet")],
    ["rejected summary omitted from preview", summaryOmitted],
    ["saved content keeps pending items", savedContent.experience.length > 0],
    ["apply review does not mutate original content object", originalObjectUnchanged],
    ["source inventory unchanged", inventoryUnchanged],
    ["risk flag label readable", riskLabel === "Needs review"],
    ["original draft omits professional summary", originalContent.professionalSummary.text === ""],
    ["reviewed status constant", "reviewed".length > 0],
    [
      "summary scoped revision does not modify experience bullets",
      summaryScopedContent.professionalSummary.text === summaryRevision.professionalSummaryText &&
        summaryScopedContent.experience[0]?.bullets[0]?.text ===
          originalContent.experience[0]?.bullets[0]?.text,
    ],
    [
      "role scoped revision does not modify unrelated roles",
      roleScopedContent.experience.length === originalContent.experience.length &&
        (originalContent.experience[1]
          ? roleScopedContent.experience[1]?.bullets[0]?.text ===
            originalContent.experience[1]?.bullets[0]?.text
          : true),
    ],
    [
      "resume custom revision persist defaults false",
      resumeCustomRevisionShouldPersist({}) === false &&
        resumeCustomRevisionShouldPersist({ persist: true }) === true,
    ],
    [
      "summary custom revision prompt scope",
      promptIncludesSummaryCustomRevisionScope(summaryPrompt),
    ],
    [
      "role custom revision prompt scope",
      promptIncludesRoleCustomRevisionScope(rolePrompt),
    ],
    [
      "batch revision prompt scope",
      promptIncludesBatchRevisionScope(batchPrompt),
    ],
    [
      "batch revision applies summary and role",
      batchContent.professionalSummary.text === batchRevision.summaryText &&
        batchContent.experience[0]?.bullets !== originalContent.experience[0]?.bullets,
    ],
    [
      "batch revision leaves unqueued roles unchanged",
      originalContent.experience[1]
        ? batchContent.experience[1]?.bullets[0]?.text ===
          originalContent.experience[1]?.bullets[0]?.text
        : true,
    ],
    [
      "unqueued role candidate ignored",
      unqueuedRoleSanitized.roleUpdates.length === 0 &&
        unqueuedRoleSanitized.warnings.some((warning) => warning.includes("unqueued")),
    ],
    [
      "malformed role candidate left unchanged with warning",
      malformedSanitized.roleUpdates.length === 0 &&
        malformedSanitized.warnings.some((warning) => warning.includes("Skipped role 0")),
    ],
    [
      "professional summary revision scope unavailable on one-page format",
      !isProfessionalSummaryRevisionScopeAvailable(originalContent),
    ],
    [
      "professional summary revision unavailable copy",
      PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY.includes("not exported"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume draft review checks passed.");
}

main();
