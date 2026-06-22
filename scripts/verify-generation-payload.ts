import { buildBulletEnrichmentKey } from "../src/lib/enrichment/keys";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { selectGenerationBullets } from "../src/lib/resume-draft/bullet-payload";
import {
  buildResumeDraftGenerationInput,
  buildResumeDraftGenerationInputLegacyOrder,
  MAX_RESUME_DRAFT_BULLETS,
} from "../src/lib/resume-draft/payload";
import {
  buildResumeDraftPrompt,
  promptIncludesAcceptedWordingRules,
  promptIncludesKeywordDistinctionRules,
} from "../src/lib/resume-draft/prompt";
import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { prepareGeneratedResumeContent } from "../src/lib/resume-draft/generation-validation";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";
import type { CollatedExperience } from "../src/types/collated";

const sampleJd: StoredJobDescription = {
  id: "jd-blockchain",
  rawText:
    "Seeking a product leader with blockchain market entry and operations experience in fintech.",
  companyName: "FinCo",
  roleTitle: "Product Lead",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function buildLegacyHeavyInventory(): InventoryState {
  const legacyBullets = Array.from({ length: 10 }, (_, index) => ({
    id: `legacy-bullet-${index}`,
    parentId: "legacy-exp",
    keyword: "Operations",
    description: `Legacy filler bullet ${index}`,
    rawBulletText: `Legacy filler bullet ${index}`,
  }));

  const bulletKey = buildBulletEnrichmentKey(
    "Acme",
    "Product Manager",
    "Led product operations improvements",
  );

  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        workExperiences: [
          {
            id: "legacy-exp",
            sourceResumeId: "resume-1",
            company: "Legacy Corp",
            descriptor: "",
            location: "",
            role: "Analyst",
            dateRange: "2010 - 2015",
            rawHeader: "",
            rawRoleLine: "",
            bullets: legacyBullets,
          },
          {
            id: "current-exp",
            sourceResumeId: "resume-1",
            company: "Current Co",
            descriptor: "",
            location: "",
            role: "Product Lead",
            dateRange: "2022 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "current-bullet-1",
                parentId: "current-exp",
                keyword: "Blockchain",
                description: "Led blockchain market entry programs across APAC",
                rawBulletText: "Led blockchain market entry programs across APAC",
              },
            ],
          },
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Acme",
            descriptor: "",
            location: "",
            role: "Product Manager",
            dateRange: "2018 - 2021",
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
    enrichment: {
      ...createEmptyEnrichmentState(),
      suggestions: [
        {
          id: "suggestion-1",
          bulletKey,
          company: "Acme",
          role: "Product Manager",
          issueType: "alternative_wording",
          issueTitle: "Stronger operations phrasing",
          beforeText: "Led product operations improvements",
          suggestedAfterText: "Led end-to-end product operations modernization",
          suggestedKeywords: ["Product Operations"],
          suggestedCapabilities: [],
          suggestedRoleTypes: [],
          changes: ["Clearer outcome wording"],
          rationale: "More specific phrasing",
          riskWarnings: [],
          status: "accepted",
          acceptedWording: "Led end-to-end product operations modernization",
          createdAt: "2025-01-01T00:00:00.000Z",
          reviewedAt: "2025-01-02T00:00:00.000Z",
          resolution: "use_suggestion",
        },
      ],
    },
  };
}

function flattenPayloadBulletDescriptions(input: ReturnType<typeof buildResumeDraftGenerationInput>) {
  return input.experiences.flatMap((experience) => experience.bullets);
}

function main() {
  const inventory = buildLegacyHeavyInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0]!,
    maxBullets: 5,
  });
  const legacyOrderInput = buildResumeDraftGenerationInputLegacyOrder({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0]!,
    maxBullets: 5,
  });
  const prompt = buildResumeDraftPrompt(generationInput);
  const mockDraft = generateMockResumeDraft(generationInput);
  const mockValidation = prepareGeneratedResumeContent(mockDraft.content);

  const payloadBullets = flattenPayloadBulletDescriptions(generationInput);
  const acmeBullet = payloadBullets.find((bullet) => bullet.company === "Acme");
  const rankedSelection = selectGenerationBullets({
    experiences: collated.experiences,
    maxBullets: 5,
    jdText: sampleJd.rawText,
    acceptedWordingByBulletKey: new Map([
      [
        buildBulletEnrichmentKey(
          "Acme",
          "Product Manager",
          "Led product operations improvements",
        ),
        "Led end-to-end product operations modernization",
      ],
    ]),
  });

  const syntheticExperiences: CollatedExperience[] = [
    {
      id: "old",
      company: "Old Co",
      role: "Analyst",
      dateRange: "2008 - 2012",
      sourceCitations: [],
      bullets: Array.from({ length: 8 }, (_, index) => ({
        id: `old-${index}`,
        description: `Old bullet ${index}`,
        rawTexts: [`Old bullet ${index}`],
        sourceCitations: [],
      })),
    },
    {
      id: "new",
      company: "New Co",
      role: "Lead",
      dateRange: "2024 - Present",
      sourceCitations: [],
      bullets: [
        {
          id: "new-1",
          keyword: "Blockchain",
          description: "Blockchain market entry execution",
          rawTexts: ["Blockchain market entry execution"],
          sourceCitations: [{ resumeId: "r1", filename: "resume.docx" }],
        },
      ],
    },
  ];

  const syntheticRanked = selectGenerationBullets({
    experiences: syntheticExperiences,
    maxBullets: 3,
    jdText: sampleJd.rawText,
    acceptedWordingByBulletKey: new Map(),
  });

  const checks: [string, boolean][] = [
    ["payload includes accepted wording", acmeBullet?.acceptedWording === "Led end-to-end product operations modernization"],
    ["payload preserves original description", acmeBullet?.description === "Led product operations improvements"],
    ["payload bullet includes date range", Boolean(acmeBullet?.dateRange)],
    ["payload bullet includes bullet key", Boolean(acmeBullet?.bulletKey)],
    ["payload bullet includes source citations", (acmeBullet?.sourceCitations.length ?? 0) > 0],
    ["approved keywords marked advisory", generationInput.approvedKeywords.every((item) => item.usage === "advisory_keyword_bank")],
    ["audit hints include bullet cap", generationInput.auditHints?.bulletCap === 5],
    ["audit hints count accepted wording bullets", (generationInput.auditHints?.bulletsWithAcceptedWording ?? 0) >= 1],
    ["audit hints include jd term sample", (generationInput.auditHints?.jdTermSample.length ?? 0) > 0],
    ["recent blockchain bullet included under ranked cap", payloadBullets.some((bullet) => bullet.description.includes("blockchain market entry"))],
    ["legacy collation-order cap excludes recent role", !legacyOrderInput.experiences.some((experience) => experience.company === "Current Co")],
    ["ranked selection prioritizes recent jd-relevant bullet", rankedSelection.selected.some((item) => item.experience.company === "Current Co")],
    ["synthetic ranked cap keeps recent blockchain bullet", syntheticRanked.selected.some((item) => item.bullet.description.includes("Blockchain market entry"))],
    ["prompt includes accepted wording rules", promptIncludesAcceptedWordingRules(prompt)],
    ["prompt includes keyword distinction rules", promptIncludesKeywordDistinctionRules(prompt)],
    ["prompt includes audit schema", prompt.includes("selectionAudit")],
    ["mock draft passes validation", mockValidation.validation.ok],
    ["mock rationale includes selection audit", Boolean(mockDraft.rationale.selectionAudit?.selectedBulletKeys?.length)],
    ["mock uses accepted wording in output when present", mockDraft.content.experience.some((role) => role.bullets.some((bullet) => bullet.text.includes("modernization")))],
    ["default bullet cap remains 40", MAX_RESUME_DRAFT_BULLETS === 40],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll generation payload checks passed.");
}

main();
