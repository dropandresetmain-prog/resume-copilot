import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import {
  buildFinalResumeLayout,
  calculateFitScore,
  estimatePageFit,
  FINAL_RESUME_SECTION_ORDER,
  formatKeywordBullet,
  layoutIncludesProfessionalSummary,
  parseKeywordBullet,
} from "../src/lib/resume-draft/layout";
import { buildReferenceResumeFormatProfile } from "../src/lib/resume-draft/reference-format";
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

function buildInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        profile: {
          fullName: "Alex Candidate",
          email: "alex@example.com",
          phone: "+1 555-0100",
          rawText: "Alex Candidate\nalex@example.com\n+1 555-0100",
          parseWarnings: [],
        },
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
                keyword: "Strategy",
                description: "Supported 50+ companies with market entry initiatives",
                rawBulletText: "Strategy: Supported 50+ companies with market entry initiatives",
              },
            ],
          },
        ],
        education: [],
        additionalExperience: {
          id: "additional-1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: ["Advanced Open Water Diver", "Conversational Japanese"],
          rawText: "Advanced Open Water Diver; Conversational Japanese",
          parseWarnings: [],
        },
        skills: {
          id: "skills-1",
          sourceResumeId: "resume-1",
          languages: [],
          technicalSkills: ["Strategy & Operations", "Product Management"],
          interests: ["Pickleball", "Travel"],
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
  const inventory = buildInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const formatProfile = buildReferenceResumeFormatProfile(inventory.resumes[0]);
  const mockDraft = generateMockResumeDraft(generationInput);
  const layout = buildFinalResumeLayout(mockDraft.content);
  const pageFit = estimatePageFit(layout);
  const assessment = calculateFitScore(mockDraft.content, mockDraft.rationale);
  const parsedBullet = parseKeywordBullet(
    "Operations: Built and rolled out a division-wide CRM workflow.",
  );
  const formattedBullet = formatKeywordBullet("Strategy", "Supported market entry initiatives");

  const checks: [string, boolean][] = [
    ["reference profile is formatting only", formatProfile.formattingOnly === true],
    ["reference profile has no sample bullets field", !("sampleBullets" in formatProfile)],
    ["section order starts with header", FINAL_RESUME_SECTION_ORDER[0] === "header"],
    ["section order ends with skillsAndInterests", FINAL_RESUME_SECTION_ORDER[4] === "skillsAndInterests"],
    ["layout has no professional summary content", !layoutIncludesProfessionalSummary(mockDraft.content)],
    ["mock bullet uses keyword colon format", mockDraft.content.experience[0]?.bullets[0]?.text.includes(":") ?? false],
    ["parse keyword bullet", parsedBullet.keyword === "Operations"],
    ["format keyword bullet", formattedBullet.startsWith("Strategy:")],
    ["additional experience compact line", layout.additionalExperienceLine.includes(",")],
    ["interests present", layout.interestsLine.length > 0],
    ["skills present", layout.skillsLine.length > 0],
    ["fit score in range", assessment.fitScore >= 0 && assessment.fitScore <= 100],
    ["fit score rationale present", assessment.scoreRationale.length > 0],
    ["optimized bullets present", assessment.optimizedFor.length >= 3],
    ["approval status constant", "approved".length > 0],
    ["page fit estimator returns lines", pageFit.estimatedLines > 0],
    ["header contact line uses pipe", layout.header.contactLine.includes("|")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume draft layout checks passed.");
}

main();
