import { existsSync } from "node:fs";
import { join } from "node:path";

import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { calculateExperienceDuration } from "../src/lib/date/duration";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import { A4_PAGE_PREVIEW_TEST_ID } from "../src/components/resume-drafts/FinalResumeLayoutPreview";
import {
  buildEducationLayoutEntry,
  buildFinalResumeLayout,
  buildWorkExperienceLayoutEntry,
  calculateFitScore,
  estimatePageFit,
  FINAL_RESUME_SECTION_ORDER,
  formatCompanyLine,
  formatKeywordBullet,
  layoutIncludesProfessionalSummary,
  parseAchievementBullet,
  parseKeywordBullet,
  shouldExcludeFromAdditionalExperience,
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
            descriptor: "Global fintech",
            location: "Singapore",
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
        education: [
          {
            id: "edu-1",
            sourceResumeId: "resume-1",
            institution: "NTU",
            location: "Singapore",
            programmes: ["MSc Finance", "BEng Mechanical Engineering"],
            dateRange: "2018 – 2022",
            bullets: ["Achievement: Premier Scholars Programme"],
            rawText: "",
            parseWarnings: [],
          },
        ],
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
          languages: ["Conversational Japanese"],
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
  const workEntry = buildWorkExperienceLayoutEntry(mockDraft.content.experience[0]!);
  const educationEntry = buildEducationLayoutEntry(mockDraft.content.education[0]!);
  const parsedBullet = parseKeywordBullet(
    "Operations: Built and rolled out a division-wide CRM workflow.",
  );
  const formattedBullet = formatKeywordBullet("Strategy", "Supported market entry initiatives");
  const achievement = parseAchievementBullet("Achievement: Premier Scholars Programme");
  const companyLine = formatCompanyLine("Acme", "Global fintech");
  const editRoutePath = join(
    process.cwd(),
    "src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx",
  );

  const referenceDate = new Date("2025-06-18");
  const marToJun = calculateExperienceDuration("Mar 2019 – Jun 2019", referenceDate);
  const janToJan = calculateExperienceDuration("Jan 2020 – Jan 2020", referenceDate);
  const decToMay = calculateExperienceDuration("Dec 2020 – May 2022", referenceDate);

  const checks: [string, boolean][] = [
    ["reference profile is formatting only", formatProfile.formattingOnly === true],
    ["reference profile has no sample bullets field", !("sampleBullets" in formatProfile)],
    ["section order starts with header", FINAL_RESUME_SECTION_ORDER[0] === "header"],
    ["section order ends with skillsAndInterests", FINAL_RESUME_SECTION_ORDER[4] === "skillsAndInterests"],
    ["layout has no professional summary content", !layoutIncludesProfessionalSummary(mockDraft.content)],
    ["mock bullet uses keyword colon format", mockDraft.content.experience[0]?.bullets[0]?.text.includes(":") ?? false],
    ["parse keyword bullet", parsedBullet.keyword === "Operations"],
    ["format keyword bullet", formattedBullet.startsWith("Strategy:")],
    ["work entry has company descriptor", workEntry.companyDescriptor === "Global fintech"],
    ["work entry company line helper", companyLine === "Acme (Global fintech)"],
    ["work entry role on separate layout field", workEntry.role === "Product Manager"],
    ["education entry has location", educationEntry.degreeBlocks[0]?.location === "Singapore"],
    ["education double degree omits repeated date", educationEntry.degreeBlocks[1]?.dateRange === undefined],
    ["achievement underline handling", achievement.underlinePrefix && achievement.prefix === "Achievement:"],
    ["exclude language from additional experience", shouldExcludeFromAdditionalExperience({ category: "Languages", text: "Japanese" })],
    ["exclude interest category from additional experience", shouldExcludeFromAdditionalExperience({ category: "Interests", text: "Pickleball" })],
    ["additional experience excludes languages", !layout.additionalExperienceLine.includes("Japanese")],
    ["interests present", layout.interestsLine.length > 0],
    ["skills present", layout.skillsLine.length > 0],
    ["languages line present when inventory has languages", layout.languagesLine.includes("Japanese")],
    ["a4 page container test id exported", A4_PAGE_PREVIEW_TEST_ID === "a4-page-container"],
    ["edit route page exists", existsSync(editRoutePath)],
    ["fit score in range", assessment.fitScore >= 0 && assessment.fitScore <= 100],
    ["fit score rationale present", assessment.scoreRationale.length > 0],
    ["optimized bullets present", assessment.optimizedFor.length >= 3],
    ["approval status constant", "approved".length > 0],
    ["page fit estimator returns lines", pageFit.estimatedLines > 0],
    ["header contact line uses pipe", layout.header.contactLine.includes("|")],
    ["duration mar to jun inclusive", marToJun.totalMonths === 4],
    ["duration jan to jan inclusive", janToJan.totalMonths === 1],
    ["duration dec 2020 to may 2022 inclusive", decToMay.totalMonths === 18],
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
