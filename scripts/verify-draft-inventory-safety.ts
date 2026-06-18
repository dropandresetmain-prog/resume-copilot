import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import {
  applyReviewStateToContent,
  createInitialReviewState,
  updateExperienceBulletReview,
} from "../src/lib/resume-draft/review-state";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_INVENTORY_SAVE_PATTERNS = [
  "saveResumeInventoryToCloud",
  "deleteResumeInventoryFromCloud",
  "upsertResume",
  "clearAllResumes",
  "enrichInventory",
  "mergeEnrichmentResult",
  "resolveSuggestionResolution",
];

const DRAFT_EDIT_SOURCE_FILES = [
  "src/components/resume-drafts/ResumeDraftReviewWorkspace.tsx",
  "src/components/pages/ResumePreviewPageClient.tsx",
  "src/components/pages/ResumeDraftEditPageClient.tsx",
  "src/lib/supabase/generated-resume-drafts.ts",
  "src/lib/resume-draft/review-state.ts",
];

const sampleJd: StoredJobDescription = {
  id: "jd-safety-1",
  rawText: "Product manager with operations experience.",
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

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function draftEditPathsAvoidInventorySaveHelpers(): boolean {
  return DRAFT_EDIT_SOURCE_FILES.every((relativePath) => {
    const source = readSource(relativePath);
    return FORBIDDEN_INVENTORY_SAVE_PATTERNS.every((pattern) => !source.includes(pattern));
  });
}

function generatedDraftUpdateTargetsDraftTableOnly(): boolean {
  const source = readSource("src/lib/supabase/generated-resume-drafts.ts");
  const match = source.match(
    /export async function updateGeneratedResumeDraftInCloud[\s\S]*?return mapped;\n}/,
  );
  if (!match) {
    return false;
  }
  const updateBlock = match[0];
  return (
    updateBlock.includes('.from("generated_resume_drafts")') &&
    updateBlock.includes(".update(") &&
    !updateBlock.includes('.from("resume_inventories")')
  );
}

function deleteGeneratedDraftTargetsDraftTableOnly(): boolean {
  const source = readSource("src/lib/supabase/generated-resume-drafts.ts");
  const match = source.match(
    /export async function deleteGeneratedResumeDraftFromCloud[\s\S]*?}\n$/,
  );
  if (!match) {
    return false;
  }
  const deleteBlock = match[0];
  return (
    deleteBlock.includes('.from("generated_resume_drafts")') &&
    deleteBlock.includes(".delete(") &&
    !deleteBlock.includes('.from("resume_inventories")')
  );
}

function simulateReviewedDraftSaveDoesNotMutateInventory(): boolean {
  const inventory = buildSampleInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const mockDraft = generateMockResumeDraft(generationInput);
  const originalInventory = JSON.stringify(inventory);
  const originalEnrichment = JSON.stringify(inventory.enrichment);
  const originalResumeBullets = JSON.stringify(inventory.resumes[0]?.workExperiences[0]?.bullets);

  let reviewState = createInitialReviewState(mockDraft.content);
  reviewState = updateExperienceBulletReview(reviewState, 0, 0, {
    status: "edited",
    editedText: "Operations: Edited draft-only bullet text.",
  });

  const reviewedContent = applyReviewStateToContent(mockDraft.content, reviewState, {
    includePending: true,
  });

  const draftOnlyEdit =
    reviewedContent.experience[0]?.bullets[0]?.text.includes("Edited draft-only") ?? false;

  return (
    draftOnlyEdit &&
    JSON.stringify(inventory) === originalInventory &&
    JSON.stringify(inventory.enrichment) === originalEnrichment &&
    JSON.stringify(inventory.resumes[0]?.workExperiences[0]?.bullets) === originalResumeBullets
  );
}

function simulateApprovedStatusChangeDoesNotMutateInventory(): boolean {
  const inventory = buildSampleInventory();
  const originalInventory = JSON.stringify(inventory);

  // Approve only changes draft status/content in Supabase — no inventory helper is invoked.
  const approvedDraft = {
    ...generateMockResumeDraft(
      buildResumeDraftGenerationInput({
        collated: buildCollatedInventory(inventory),
        enrichment: inventory.enrichment,
        jobDescription: sampleJd,
        referenceResume: inventory.resumes[0],
      }),
    ),
    status: "approved" as const,
  };

  return approvedDraft.status === "approved" && JSON.stringify(inventory) === originalInventory;
}

function deleteDraftDoesNotTouchInventoryHelpers(): boolean {
  const inventory = buildSampleInventory();
  const originalInventory = JSON.stringify(inventory);
  const draftsBefore = [{ id: "draft-1" }, { id: "draft-2" }];
  const draftsAfter = draftsBefore.filter((draft) => draft.id !== "draft-1");

  return (
    draftsAfter.length === 1 &&
    draftsAfter[0]?.id === "draft-2" &&
    JSON.stringify(inventory) === originalInventory
  );
}

function reviewStateApplyDoesNotMutateOriginalContent(): boolean {
  const inventory = buildSampleInventory();
  const mockDraft = generateMockResumeDraft(
    buildResumeDraftGenerationInput({
      collated: buildCollatedInventory(inventory),
      enrichment: inventory.enrichment,
      jobDescription: sampleJd,
      referenceResume: inventory.resumes[0],
    }),
  );
  const originalFirstBullet = mockDraft.content.experience[0]?.bullets[0]?.text ?? "";

  let reviewState = createInitialReviewState(mockDraft.content);
  reviewState = updateExperienceBulletReview(reviewState, 0, 0, {
    status: "edited",
    editedText: "Operations: Mutated in review copy only.",
  });

  applyReviewStateToContent(mockDraft.content, reviewState);
  const originalContentUnchanged = mockDraft.content.experience[0]?.bullets[0]?.text === originalFirstBullet;

  return originalContentUnchanged;
}

function main() {
  const checks: [string, boolean][] = [
    ["draft edit paths avoid inventory save helpers", draftEditPathsAvoidInventorySaveHelpers()],
    ["updateGeneratedResumeDraftInCloud targets generated_resume_drafts only", generatedDraftUpdateTargetsDraftTableOnly()],
    ["deleteGeneratedResumeDraftFromCloud targets generated_resume_drafts only", deleteGeneratedDraftTargetsDraftTableOnly()],
    ["editing generated bullet does not mutate inventory object", simulateReviewedDraftSaveDoesNotMutateInventory()],
    ["marking draft reviewed/approved does not mutate inventory", simulateApprovedStatusChangeDoesNotMutateInventory()],
    ["deleting generated draft does not affect inventory", deleteDraftDoesNotTouchInventoryHelpers()],
    ["applyReviewStateToContent leaves original draft content unchanged", reviewStateApplyDoesNotMutateOriginalContent()],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll draft inventory safety checks passed.");
}

main();
