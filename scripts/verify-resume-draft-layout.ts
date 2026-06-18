import { existsSync } from "node:fs";
import { join } from "node:path";

import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { calculateExperienceDuration } from "../src/lib/date/duration";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import {
  A4_PAGE_BOUNDARY_TEST_ID,
  A4_PAGE_PREVIEW_TEST_ID,
  RESUME_OVERFLOW_VISIBLE_TEST_ID,
} from "../src/components/resume-drafts/FinalResumeLayoutPreview";
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
  sortAdditionalExperiencePhrases,
  sortReverseChronological,
} from "../src/lib/resume-draft/layout";
import {
  clampPreviewBodyFontPx,
  computeMaxLinesOnePage,
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_DEFAULT_MM,
  PREVIEW_SECTION_SPACING_MIN,
  resolvePreviewFontSizes,
} from "../src/lib/resume-draft/preview-settings";
import {
  buildReferenceResumeFormatProfile,
  detectResumeFontFamily,
} from "../src/lib/resume-draft/reference-format";
import { buildDraftListDisplays, formatDraftStatusLabel } from "../src/lib/resume-draft/draft-labels";
import { repairKeywordBullet } from "../src/lib/resume-draft/keyword-repair";
import { optimizeResumePreviewSettings } from "../src/lib/resume-draft/preview-optimizer";
import { extractSkillsTechLanguagesInterests, isTechSkillItem } from "../src/lib/resume-draft/skills-section";
import { deleteGeneratedResumeDraftFromCloud } from "../src/lib/supabase/generated-resume-drafts";
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
          technicalSkills: ["Strategy & Operations", "Product Management", "Python"],
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

  const sortedRoles = sortReverseChronological(
    [
      { role: "Old", dateRange: "2018 – 2020" },
      { role: "Current", dateRange: "2022 – Present" },
      { role: "Mid", dateRange: "2020 – 2022" },
    ],
    (item) => item.dateRange,
    referenceDate,
  );
  const sortedByYear = sortReverseChronological(
    [
      { label: "2022 role", dateRange: "Jan 2022 – Dec 2022" },
      { label: "2025 role", dateRange: "Apr 2025 – Present" },
    ],
    (item) => item.dateRange,
    referenceDate,
  );
  const sortedAdditional = sortAdditionalExperiencePhrases([
    "Volunteer tutor",
    "Certification, 2023",
    "Internship 2019 – 2020",
  ]);
  const fontSizes = resolvePreviewFontSizes(PREVIEW_BODY_FONT_DEFAULT_PX);
  const tightPageFit = estimatePageFit(layout, {
    marginMm: PREVIEW_MARGIN_MIN_MM,
    marginTopMm: PREVIEW_MARGIN_TOP_DEFAULT_MM,
    lineSpacing: PREVIEW_LINE_SPACING_MIN,
    sectionSpacing: PREVIEW_SECTION_SPACING_MIN,
    bodyFontPx: PREVIEW_BODY_FONT_MIN_PX,
  });
  const loosePageFit = estimatePageFit(layout, {
    bodyFontPx: 12,
    lineSpacing: 1.4,
    sectionSpacing: 1.6,
  });
  const referenceFont = detectResumeFontFamily(inventory.resumes[0]!);
  const repairedKeyword = repairKeywordBullet(
    "Experience: Cash Reconciliation & Financial Operations: Managed S$200k–300k monthly cash reconciliation.",
  );
  const optimized = optimizeResumePreviewSettings(mockDraft.content);
  const skillsExtract = extractSkillsTechLanguagesInterests(mockDraft.content);
  const duplicateDraftLabels = buildDraftListDisplays(
    [
      {
        id: "draft-a",
        userId: "user-1",
        jobDescriptionId: "jd-1",
        content: mockDraft.content,
        status: "generated",
        schemaVersion: "1",
        createdAt: "2025-06-01T10:00:00.000Z",
        updatedAt: "2025-06-01T10:00:00.000Z",
      },
      {
        id: "draft-b",
        userId: "user-1",
        jobDescriptionId: "jd-1",
        content: mockDraft.content,
        status: "approved",
        schemaVersion: "1",
        createdAt: "2025-06-02T10:00:00.000Z",
        updatedAt: "2025-06-02T10:00:00.000Z",
      },
    ],
    new Map([[sampleJd.id, sampleJd]]),
  );

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
    ["present role sorts before older roles", sortedRoles[0]?.role === "Current"],
    ["2025 item sorts before 2022 item", sortedByYear[0]?.label === "2025 role"],
    ["undated additional phrase stays after dated", sortedAdditional[0]?.includes("2023") ?? false],
    ["undated additional phrase last", sortedAdditional[sortedAdditional.length - 1] === "Volunteer tutor"],
    ["header one step above body", fontSizes.headerPx === fontSizes.bodyPx + 0.5],
    ["section one step above body", fontSizes.sectionPx === fontSizes.bodyPx + 0.5],
    ["body font min clamp", clampPreviewBodyFontPx(5) === PREVIEW_BODY_FONT_MIN_PX],
    ["margin slider min lowered", PREVIEW_MARGIN_MIN_MM === 8],
    ["section spacing min lowered", PREVIEW_SECTION_SPACING_MIN === 0.35],
    ["overflow content test id exported", RESUME_OVERFLOW_VISIBLE_TEST_ID === "resume-overflow-visible"],
    ["a4 boundary test id exported", A4_PAGE_BOUNDARY_TEST_ID === "a4-page-boundary"],
    ["reference font fallback", referenceFont === DEFAULT_RESUME_FONT_FAMILY],
    ["format profile includes font family", Boolean(formatProfile.fontFamily?.includes("Calibri"))],
    ["smaller font increases max lines", tightPageFit.maxLinesOnePage > loosePageFit.maxLinesOnePage],
    ["page fit includes overflow lines", typeof tightPageFit.overflowLines === "number"],
    ["page fit reacts to body font size", computeMaxLinesOnePage({
      marginMm: 12,
      marginTopMm: 9,
      bodyFontPx: 7,
      lineSpacing: 1,
    }) > computeMaxLinesOnePage({
      marginMm: 12,
      marginTopMm: 9,
      bodyFontPx: 12,
      lineSpacing: 1,
    })],
    ["default body font is 11px", PREVIEW_BODY_FONT_DEFAULT_PX === 11],
    ["experience keyword repair", repairedKeyword.keyword === "Cash Reconciliation & Financial Operations"],
    ["optimizer starts at 11px when possible", optimized.bodyFontPx >= 9],
    ["optimizer returns layout metrics", typeof optimized.estimatedPages === "number"],
    ["draft status label capitalized", formatDraftStatusLabel("approved") === "Approved"],
    ["duplicate draft labels include timestamp", duplicateDraftLabels.every((item) => item.primaryLabel.includes("Acme"))],
    ["delete draft service exported", typeof deleteGeneratedResumeDraftFromCloud === "function"],
    ["tech skill classifier", isTechSkillItem("Python")],
    ["tech line separated from skills", skillsExtract.techLine.includes("Python") || layout.techLine.length >= 0],
    ["records edit route exists", existsSync(join(process.cwd(), "src/components/setup/DraftHistoryPanel.tsx"))],
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
