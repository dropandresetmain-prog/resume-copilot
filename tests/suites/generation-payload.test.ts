import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { buildEvidenceSpine } from "../../src/lib/evidence/spine";
import { buildAddEvidenceList } from "../../src/lib/resume-draft/add-evidence-list";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { applyInventoryEditsToCollated } from "../../src/lib/inventory/edits";
import { selectGenerationBullets } from "../../src/lib/resume-draft/bullet-payload";
import {
  buildResumeDraftGenerationInput,
  buildResumeDraftGenerationInputLegacyOrder,
  buildResumeDraftPayloadFromInventory,
  MAX_RESUME_DRAFT_BULLETS,
} from "../../src/lib/resume-draft/payload";
import { buildPackageTailoringDiagnostics } from "../../src/lib/package/tailoring-diagnostics";
import {
  buildResumeDraftPrompt,
  promptIncludesAcceptedWordingRules,
  promptIncludesAntiGenericLanguageRules,
  promptIncludesJdReframingRules,
  promptIncludesKeywordDistinctionRules,
  promptIncludesRationaleQualityRules,
  promptIncludesResumeCompanyContextRules,
  promptIncludesSeniorRoleSelectionRules,
  promptIncludesSourceRefsRules,
  promptUsesCompactJsonPayload,
} from "../../src/lib/resume-draft/prompt";
import {
  pruneRedundantRawTexts,
  serializeResumeDraftPromptPayload,
} from "../../src/lib/resume-draft/prompt-payload";
import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { prepareGeneratedResumeContent } from "../../src/lib/resume-draft/generation-validation";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";
import type { CollatedExperience } from "../../src/types/collated";

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
  const tailoringDiagnostics = buildPackageTailoringDiagnostics({
    resumeDraft: {
      id: "tailoring-draft",
      userId: "user-1",
      jobDescriptionId: sampleJd.id,
      content: mockDraft.content,
      rationale: mockDraft.rationale,
      inputSnapshot: buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription: sampleJd,
        referenceResumeId: "resume-1",
      }).inputSnapshot,
      status: "generated",
      schemaVersion: "1",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    jobDescription: sampleJd,
  });

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

  const seniorJdText =
    "VP Engineering with 10+ years software leadership, platform scaling, and team management.";
  const seniorVsInternExperiences: CollatedExperience[] = [
    {
      id: "intern",
      company: "Startup Labs",
      role: "Software Engineering Intern",
      dateRange: "Jun 2020 - Aug 2020",
      sourceCitations: [],
      bullets: [
        {
          id: "intern-1",
          keyword: "Engineering",
          description: "Assisted with software engineering tasks during internship",
          rawTexts: ["Assisted with software engineering tasks during internship"],
          sourceCitations: [],
        },
      ],
    },
    {
      id: "senior",
      company: "Platform Co",
      role: "VP Engineering",
      dateRange: "2018 - Present",
      sourceCitations: [],
      bullets: [
        {
          id: "senior-1",
          keyword: "Platform",
          description: "Led platform scaling and engineering leadership for 40+ engineers",
          rawTexts: ["Led platform scaling and engineering leadership for 40+ engineers"],
          sourceCitations: [{ resumeId: "r1", filename: "resume.docx" }],
        },
      ],
    },
  ];
  const seniorVsInternRanked = selectGenerationBullets({
    experiences: seniorVsInternExperiences,
    maxBullets: 2,
    jdText: seniorJdText,
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
    [
      "internship does not displace senior role under ranked cap",
      seniorVsInternRanked.selected[0]?.experience.company === "Platform Co",
    ],
    ["prompt includes JD reframing rules", promptIncludesJdReframingRules(prompt)],
    ["prompt includes anti-generic language rules", promptIncludesAntiGenericLanguageRules(prompt)],
    ["prompt includes rationale quality rules", promptIncludesRationaleQualityRules(prompt)],
    ["prompt includes senior role selection rules", promptIncludesSeniorRoleSelectionRules(prompt)],
    ["prompt includes accepted wording rules", promptIncludesAcceptedWordingRules(prompt)],
    ["prompt includes keyword distinction rules", promptIncludesKeywordDistinctionRules(prompt)],
    ["prompt includes sourceRefs rules", promptIncludesSourceRefsRules(prompt)],
    ["prompt uses compact json payload", promptUsesCompactJsonPayload(prompt)],
    ["prompt includes audit schema", prompt.includes("selectionAudit")],
    ["mock draft passes validation", mockValidation.validation.ok],
    ["mock rationale includes selection audit", Boolean(mockDraft.rationale.selectionAudit?.selectedBulletKeys?.length)],
    [
      "mock rationale includes strongest matches and positioning",
      (mockDraft.rationale.selectionAudit?.strongestMatches?.length ?? 0) > 0 &&
        Boolean(mockDraft.rationale.selectionAudit?.positioningAngle?.trim()),
    ],
    ["mock uses accepted wording in output when present", mockDraft.content.experience.some((role) => role.bullets.some((bullet) => bullet.text.includes("modernization")))],
    ["default bullet cap remains 40", MAX_RESUME_DRAFT_BULLETS === 40],
    [
      "prune rawTexts drops duplicate of description",
      pruneRedundantRawTexts(["Led product operations improvements"], "Led product operations improvements").length === 0,
    ],
    [
      "prune rawTexts keeps distinct metric variant",
      pruneRedundantRawTexts(
        ["Led product operations improvements saving S$200k annually"],
        "Led product operations improvements",
      ).length === 1,
    ],
    [
      "compact prompt payload omits duplicate rawTexts",
      !serializeResumeDraftPromptPayload(generationInput).includes('"rawTexts":["Led product operations improvements"]'),
    ],
    [
      "generation input still retains full rawTexts for validation",
      generationInput.experiences[0]?.bullets[0]?.rawTexts.length === 1,
    ],
    [
      "generation input includes evidence spine snapshot",
      generationInput.evidenceSpine?.version === 1 &&
        Boolean(generationInput.evidenceSpine.positioningAngle),
    ],
    [
      "input snapshot persists evidence spine for fit and story use",
      Boolean(
        buildResumeDraftPayloadFromInventory({
          inventory,
          jobDescription: sampleJd,
          referenceResumeId: "resume-1",
        }).inputSnapshot.evidenceSpine?.selectedIds.length,
      ),
    ],
    [
      "tailoring diagnostics reads evidence spine snapshot",
      tailoringDiagnostics.available &&
        tailoringDiagnostics.selectedEvidence.length > 0 &&
        tailoringDiagnostics.selectedEvidence[0]!.message.includes("JD relevance"),
    ],
    [
      "tailoring diagnostics builder returns evidence sections",
      Array.isArray(tailoringDiagnostics.omittedEvidence) &&
        Array.isArray(tailoringDiagnostics.suggestedActions),
    ],
  ];

  const hiddenInventory = buildLegacyHeavyInventory();
  const hideKey = buildBulletEnrichmentKey(
    "Acme",
    "Product Manager",
    "Led product operations improvements",
  );
  hiddenInventory.edits = {
    hiddenBulletKeys: [hideKey],
    editedBulletTextByBulletKey: {},
  };
  const hiddenCollated = buildCollatedInventory(hiddenInventory);
  const hiddenActive = applyInventoryEditsToCollated(hiddenCollated, hiddenInventory.edits);
  const hiddenInput = buildResumeDraftGenerationInput({
    collated: hiddenActive,
    enrichment: hiddenInventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: hiddenInventory.resumes[0]!,
    maxBullets: 5,
  });
  const hiddenPayloadBullets = hiddenInput.experiences.flatMap((experience) => experience.bullets);

  checks.push(
    ["hidden inventory bullet excluded from payload", !hiddenPayloadBullets.some((bullet) => bullet.bulletKey === hideKey)],
  );

  const hiddenSpine = buildEvidenceSpine({
    collated: hiddenActive,
    enrichment: hiddenInventory.enrichment,
    jdText: sampleJd.rawText,
    maxWorkBullets: MAX_RESUME_DRAFT_BULLETS,
  });
  const hiddenAddList = buildAddEvidenceList(
    hiddenSpine,
    {
      schemaVersion: 1,
      header: { includeHeader: false },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      skills: { groups: [], jdAlignment: [], riskFlags: [] },
      experience: [],
      education: [],
      additionalExperience: [],
      globalRiskFlags: [],
    },
    undefined,
    { hiddenBulletKeys: [hideKey] },
  );
  checks.push(
    ["hidden inventory bullet omitted from add evidence list", !hiddenAddList.some((row) => row.bulletKey === hideKey)],
  );

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll generation payload checks passed.");
}

main();
