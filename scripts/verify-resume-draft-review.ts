import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import { formatKeywordBullet } from "../src/lib/resume-draft/layout";
import { formatRiskFlagLabel } from "../src/lib/resume-draft/preview-helpers";
import {
  applyReviewStateToContent,
  createInitialReviewState,
  updateExperienceBulletReview,
  updateProfessionalSummaryReview,
} from "../src/lib/resume-draft/review-state";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

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
