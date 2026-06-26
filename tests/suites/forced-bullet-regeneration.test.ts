import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildEvidenceSpine } from "../../src/lib/evidence/spine";
import { buildAddEvidenceList } from "../../src/lib/resume-draft/add-evidence-list";
import { additionalEvidenceId } from "../../src/lib/evidence/collect";
import { buildEvidenceQueueSummary } from "../../src/lib/resume-draft/evidence-pending-queue";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { rewriteMockResumeRole } from "../../src/lib/ai/resume-role-rewrite-mock";
import { selectGenerationBullets } from "../../src/lib/resume-draft/bullet-payload";
import {
  auditForcedBullets,
  buildRegenerationOutcomeSummary,
  collectForcedKeysPresentInOutput,
  collectPayloadBulletKeys,
  explainUnavailableForcedKeys,
  findForcedKeysAlreadyInPayload,
  promptIncludesForcedBulletRules,
  validateForcedBulletsInOutput,
} from "../../src/lib/resume-draft/forced-bullets";
import { buildResumeDraftPrompt, promptIncludesWorkExperienceBulletRules } from "../../src/lib/resume-draft/prompt";
import {
  promptIncludesRoleRewriteScopeRules,
  buildResumeRoleRewritePrompt,
} from "../../src/lib/resume-draft/role-rewrite-prompt";
import {
  promptIncludesRoleCustomRevisionScope,
  buildResumeRoleCustomRevisionPrompt,
} from "../../src/lib/resume-draft/custom-revision-prompt";
import {
  validateCustomRevisedRoleBullets,
} from "../../src/lib/resume-draft/custom-revision";
import {
  applyTargetedRoleRewrites,
  planTargetedForcedBulletRewrite,
  resolveDraftStatusAfterTargetedRewrite,
  TARGETED_REWRITE_BLOCKED_MESSAGE,
  validateRewrittenRoleBullets,
} from "../../src/lib/resume-draft/targeted-role-rewrite";
import { RESUME_DRAFT_STATUS_APPROVED, RESUME_DRAFT_STATUS_LAYOUT_CHANGED } from "../../src/lib/resume-draft/draft-status";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  prepareGeneratedResumeContent,
  TARGET_TOTAL_WORK_BULLETS_MAX,
} from "../../src/lib/resume-draft/generation-validation";
import { repairGeneratedResumeContent } from "../../src/lib/resume-draft/repair-generated-content";
import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftGenerationInput,
} from "../../src/types/resume-draft";
import type { CollatedExperience, CollatedInventory } from "../../src/types/collated";
import type { CollatedBulletListing } from "../../src/lib/inventory/edits";

const forcedKey = buildBulletEnrichmentKey(
  "Drop & Reset",
  "Founder",
  "Built partner CRM automation workflows",
);
const lowRankKey = buildBulletEnrichmentKey(
  "Old Role",
  "Analyst",
  "Generic administrative support tasks",
);

function sampleBullet(text: string, bulletKey?: string): ResumeDraftExperienceBullet {
  return {
    text,
    sourceRefs: bulletKey ? [{ bulletKey, resumeId: "resume-1" }] : [],
    jdAlignmentReason: "Aligned to role requirements.",
    confidence: "high",
    riskFlags: [],
  };
}

function buildRole(
  company: string,
  bullets: Array<{ text: string; bulletKey?: string }>,
) {
  return {
    company,
    role: "Founder",
    dateRange: "Apr 2025 – Present",
    bullets: bullets.map((bullet) => sampleBullet(bullet.text, bullet.bulletKey)),
    riskFlags: [],
  };
}

function buildValidSkeleton(overrides: Partial<ResumeDraftContent> = {}): ResumeDraftContent {
  return {
    schemaVersion: 1,
    header: { includeHeader: false },
    professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
    skills: {
      groups: [
        { label: "Skills", items: ["CRM", "B2B Sales"] },
        { label: "Languages", items: ["English"] },
        { label: "Interests", items: ["Fitness"] },
      ],
      jdAlignment: [],
      riskFlags: [],
    },
    experience: [
      buildRole("ShelfPerfect Target", [
        { text: "Sales: Managed FMCG pipeline growth", bulletKey: "sales-1" },
        { text: "CRM: Built partner workflows", bulletKey: forcedKey },
        { text: "Ops: Revenue reconciliation", bulletKey: "sales-2" },
        { text: "Growth: Expanded accounts", bulletKey: "sales-3" },
        { text: "Partnerships: Closed deals", bulletKey: "sales-4" },
        { text: "Forecasting: Planned targets", bulletKey: "sales-5" },
      ]),
      buildRole("Socius Living", [
        { text: "Sales: B2B outreach", bulletKey: "soc-1" },
        { text: "CRM: Pipeline hygiene", bulletKey: "soc-2" },
        { text: "Ops: Reporting", bulletKey: "soc-3" },
      ]),
    ],
    education: [],
    additionalExperience: [],
    globalRiskFlags: [],
    ...overrides,
  };
}

function buildManyInventoryExperiences(): CollatedExperience[] {
  const experiences: CollatedExperience[] = [];
  for (let index = 0; index < 8; index += 1) {
    experiences.push({
      id: `exp-${index}`,
      company: `Company ${index}`,
      role: "Founder",
      dateRange: "2024 – Present",
      descriptor: undefined,
      location: undefined,
      sourceCitations: [],
      bullets: Array.from({ length: 8 }, (_, bulletIndex) => ({
        id: `bullet-${index}-${bulletIndex}`,
        keyword:
          bulletIndex === 7 && index === 7 ? undefined : "Operations",
        description:
          bulletIndex === 7 && index === 7
            ? "Routine office paperwork and filing support"
            : `Generic inventory bullet ${index}-${bulletIndex}`,
        rawTexts:
          bulletIndex === 7 && index === 7
            ? ["Routine office paperwork and filing support"]
            : [],
        sourceCitations: [],
        inventoryBulletKey:
          bulletIndex === 7 && index === 7
            ? forcedKey
            : buildBulletEnrichmentKey(
                `Company ${index}`,
                "Founder",
                `Generic inventory bullet ${index}-${bulletIndex}`,
              ),
      })),
    });
  }
  return experiences;
}

function buildGenerationInputWithForced(): ResumeDraftGenerationInput {
  return {
    jobDescription: {
      id: "jd-1",
      rawText: "B2B sales CRM pipeline revenue growth stakeholder management",
      companyName: "ShelfPerfect",
      roleTitle: "B2B Sales Manager",
    },
    approvedKeywords: [],
    experiences: [],
    education: [],
    additionalExperience: [],
    skills: [],
    referenceResume: {
      resumeId: "resume-1",
      filename: "resume.docx",
      formattingOnly: true,
      bulletStyle: "keyword_colon",
      sectionOrder: ["Work Experience", "Education", "Skills"],
      densityHint: "compact",
    },
    auditHints: {
      bulletCap: 40,
      totalInventoryBullets: 64,
      bulletsIncluded: 40,
      bulletsOmitted: 24,
      bulletsWithAcceptedWording: 0,
      jdTermSample: ["sales", "crm"],
    },
    regenerationControls: {
      forcedBulletKeys: [forcedKey],
      excludedBulletKeys: [],
    },
  };
}

function makeListing(
  company: string,
  role: string,
  description: string,
  bulletKey: string,
): CollatedBulletListing {
  const experience = {
    id: `${company}-${role}`,
    company,
    role,
    dateRange: "2024 – Present",
    bullets: [],
    sourceCitations: [],
  } as CollatedExperience;

  return {
    experience,
    bullet: {
      id: bulletKey,
      description,
      keyword: "Operations",
      rawTexts: [description],
      sourceCitations: [],
      inventoryBulletKey: bulletKey,
    },
    bulletKey,
    isHidden: false,
    effectiveDescription: description,
  };
}

function buildCrossCategoryCollated(): CollatedInventory {
  return {
    experiences: [
      {
        id: "exp-low",
        company: "Legacy Corp",
        role: "Analyst",
        sourceCitations: [],
        bullets: [
          {
            id: "low-bullet",
            keyword: "Blockchain",
            description: "Prepared internal reporting packs",
            rawTexts: ["Prepared internal reporting packs"],
            sourceCitations: [],
          },
        ],
      },
    ],
    educationItems: [
      {
        id: "edu-1",
        institution: "Business School",
        programmes: ["MBA Fintech and Blockchain"],
        bullets: [],
        rawTexts: [],
        sourceCitations: [],
        parseWarnings: [],
      },
    ],
    additionalExperienceItems: [
      {
        id: "add-line-1",
        category: "Projects",
        text: "Led blockchain fintech market entry pilot across APAC partners",
        rawTexts: ["Led blockchain fintech market entry pilot across APAC partners"],
        sourceCitations: [],
      },
    ],
    skillItems: [
      {
        id: "skill-1",
        category: "Technical Skills",
        text: "Blockchain platform operations",
        sourceCitations: [],
      },
    ],
  };
}

function buildManyAdditionalItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `add-${index}`,
    category: index === count - 1 ? "Volunteer" : "Projects",
    text:
      index === count - 1
        ? "Routine community outreach coordination"
        : `Blockchain fintech pilot initiative ${index}`,
    rawTexts: [
      index === count - 1
        ? "Routine community outreach coordination"
        : `Blockchain fintech pilot initiative ${index}`,
    ],
    sourceCitations: [],
  }));
}

function main() {
  const jdText = "B2B sales CRM pipeline revenue growth stakeholder management";

  const rankedWithoutForce = selectGenerationBullets({
    experiences: buildManyInventoryExperiences(),
    maxBullets: 7,
    jdText,
    acceptedWordingByBulletKey: new Map(),
  });
  const rankedWithForce = selectGenerationBullets({
    experiences: buildManyInventoryExperiences(),
    maxBullets: 7,
    jdText,
    acceptedWordingByBulletKey: new Map(),
    forcedBulletKeys: [forcedKey],
  });
  const forcedOutsideTopRank =
    !rankedWithoutForce.selected.some((item) => item.bulletKey === forcedKey) &&
    rankedWithForce.selected.some((item) => item.bulletKey === forcedKey);

  const repairInput = buildValidSkeleton();
  const repaired = repairGeneratedResumeContent(repairInput, {
    jdText,
    forcedBulletKeys: [forcedKey],
  });
  const forcedSurvivesRepair = collectForcedKeysPresentInOutput(
    repaired.content,
    [forcedKey],
  ).includes(forcedKey);

  const baselineKeys = new Set(rankedWithoutForce.selected.map((item) => item.bulletKey));
  const alreadyInPayload = findForcedKeysAlreadyInPayload({
    forcedKeys: rankedWithoutForce.selected.slice(0, 1).map((item) => item.bulletKey),
    baselinePayloadKeys: baselineKeys,
  });

  const unavailableEntries = explainUnavailableForcedKeys({
    unavailableKeys: [lowRankKey],
    excludedBulletKeys: [lowRankKey],
    hiddenBulletKeys: [],
  });

  const unchangedContent = buildValidSkeleton();
  const outcomeUnchanged = buildRegenerationOutcomeSummary({
    priorContent: unchangedContent,
    newContent: unchangedContent,
    audit: auditForcedBullets({
      forcedKeys: [forcedKey],
      alreadyInPayloadKeys: [forcedKey],
      contentBeforeRepair: unchangedContent,
      contentAfterRepair: unchangedContent,
    }),
  });

  const missingOutputAudit = auditForcedBullets({
    forcedKeys: [forcedKey],
    contentBeforeRepair: unchangedContent,
    contentAfterRepair: {
      ...unchangedContent,
      experience: [
        buildRole("ShelfPerfect Target", [
          { text: "Sales: Managed FMCG pipeline growth", bulletKey: "sales-1" },
          { text: "Ops: Revenue reconciliation", bulletKey: "sales-2" },
          { text: "Growth: Expanded accounts", bulletKey: "sales-3" },
        ]),
      ],
    },
  });
  const missingWarnings = validateForcedBulletsInOutput(missingOutputAudit);

  const preparedWithForced = prepareGeneratedResumeContent(buildValidSkeleton(), {
    jdText,
    forcedBulletKeys: [forcedKey],
    unavailableForcedKeys: [lowRankKey],
    excludedBulletKeys: [lowRankKey],
  });

  const targetedContent = buildValidSkeleton({
    experience: [
      buildRole("Drop & Reset", [
        { text: "Ops: Existing bullet one", bulletKey: "drop-1" },
        { text: "CRM: Existing bullet two", bulletKey: forcedKey },
        { text: "Growth: Existing bullet three", bulletKey: "drop-3" },
      ]),
      buildRole("Socius Living", [
        { text: "Sales: Socius bullet", bulletKey: "soc-1" },
        { text: "Ops: Socius bullet two", bulletKey: "soc-2" },
      ]),
    ],
  });
  const secondForcedKey = buildBulletEnrichmentKey(
    "Drop & Reset",
    "Founder",
    "Hosted community events",
  );
  const multiKeyPlan = planTargetedForcedBulletRewrite({
    content: targetedContent,
    forcedBulletKeys: [forcedKey, secondForcedKey],
    inventoryListings: [
      makeListing("Drop & Reset", "Founder", "Built partner CRM automation workflows", forcedKey),
      makeListing("Drop & Reset", "Founder", "Hosted community events", secondForcedKey),
    ],
  });
  const prompt = buildResumeDraftPrompt(buildGenerationInputWithForced());
  const targetedPlan = planTargetedForcedBulletRewrite({
    content: targetedContent,
    forcedBulletKeys: [forcedKey],
    inventoryListings: [
      makeListing("Drop & Reset", "Founder", "Built partner CRM automation workflows", forcedKey),
    ],
  });
  const roleRewritePrompt = buildResumeRoleRewritePrompt({
    currentRole: targetedContent.experience[0]!,
    forcedBulletKeys: [forcedKey],
    inventoryBullets: [
      {
        bulletKey: forcedKey,
        description: "Built partner CRM automation workflows",
        company: "Drop & Reset",
        role: "Founder",
      },
    ],
    jobDescriptionText: jdText,
    targetRoleTitle: "B2B Sales Manager",
  });
  const absentRolePlan = planTargetedForcedBulletRewrite({
    content: targetedContent,
    forcedBulletKeys: [lowRankKey],
    inventoryListings: [
      makeListing("Old Role", "Analyst", "Generic administrative support tasks", lowRankKey),
    ],
  });
  const mockRoleRewrite = rewriteMockResumeRole({
    currentRole: targetedContent.experience[0]!,
    forcedBulletKeys: [forcedKey],
    inventoryBullets: [
      {
        bulletKey: forcedKey,
        description: "Built partner CRM automation workflows",
        company: "Drop & Reset",
        role: "Founder",
      },
    ],
    jobDescriptionText: jdText,
  });
  const patchedContent = applyTargetedRoleRewrites(targetedContent, [
    { roleIndex: 0, bullets: mockRoleRewrite.bullets },
  ]);
  const invalidRoleIssues = validateRewrittenRoleBullets({
    bullets: [{ text: "Only one bullet", sourceRefs: [{ bulletKey: forcedKey }], confidence: "high", riskFlags: [] }],
    forcedBulletKeys: [forcedKey],
    allowedSourceBulletKeys: [forcedKey],
  });
  const regenerationPanel = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx"),
    "utf8",
  );
  const roleRewriteRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/rewrite-resume-role/route.ts"),
    "utf8",
  );
  const resumeCustomRevisionRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/revise-resume-scope/route.ts"),
    "utf8",
  );
  const customRolePrompt = buildResumeRoleCustomRevisionPrompt({
    currentRole: targetedContent.experience[0]!,
    customInstruction: "Sharpen revenue metrics.",
    jobDescriptionText: "B2B sales role",
  });

  const categoryJdText =
    "Product leader with blockchain fintech market entry, platform operations, and stakeholder leadership.";
  const categoryCollated = buildCrossCategoryCollated();
  const categoryEnrichment = {
    ...createEmptyEnrichmentState(),
    keywordBank: [
      {
        id: "kw-1",
        keyword: "Blockchain",
        category: "market",
        approved: true,
        source: "manual" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  };
  const categorySpine = buildEvidenceSpine({
    collated: categoryCollated,
    enrichment: categoryEnrichment,
    jdText: categoryJdText,
    roleTitle: "Product Lead",
    maxWorkBullets: 5,
  });
  const emptyDraftContent = buildValidSkeleton();
  const categoryAddList = buildAddEvidenceList(categorySpine, emptyDraftContent);
  const categoryLabels = new Set(categoryAddList.map((row) => row.categoryLabel));
  const listMatchesRelevanceSort = categoryAddList.every(
    (row, index, array) =>
      index === 0 || row.relevanceScore <= array[index - 1]!.relevanceScore,
  );

  const workBulletKey = buildBulletEnrichmentKey(
    "Legacy Corp",
    "Analyst",
    "Prepared internal reporting packs",
  );
  const excludedSpine = buildEvidenceSpine({
    collated: categoryCollated,
    enrichment: categoryEnrichment,
    jdText: categoryJdText,
    maxWorkBullets: 5,
    regenerationControls: { forcedBulletKeys: [], excludedBulletKeys: [workBulletKey] },
  });
  const excludedAddList = buildAddEvidenceList(excludedSpine, emptyDraftContent, {
    forcedBulletKeys: [],
    excludedBulletKeys: [workBulletKey],
  });
  const hiddenAddList = buildAddEvidenceList(categorySpine, emptyDraftContent, undefined, {
    hiddenBulletKeys: [workBulletKey],
  });

  const nonWorkRows = categoryAddList.filter((row) => row.sourceType !== "work_bullet");
  const keywordRows = categoryAddList.filter((row) => row.sourceType === "keyword_tied");
  const workAddableRows = categoryAddList.filter((row) => row.actionState === "addable");
  const nonWorkTargetedPlan = planTargetedForcedBulletRewrite({
    content: emptyDraftContent,
    forcedBulletKeys: nonWorkRows.map((row) => row.id),
    inventoryListings: [],
  });

  const manyAdditionalCollated: CollatedInventory = {
    ...categoryCollated,
    additionalExperienceItems: buildManyAdditionalItems(8),
  };
  const lowRankAdditionalId = additionalEvidenceId("add-7");
  const baselineAdditionalSpine = buildEvidenceSpine({
    collated: manyAdditionalCollated,
    enrichment: categoryEnrichment,
    jdText: categoryJdText,
    maxWorkBullets: 5,
  });
  const forcedAdditionalSpine = buildEvidenceSpine({
    collated: manyAdditionalCollated,
    enrichment: categoryEnrichment,
    jdText: categoryJdText,
    maxWorkBullets: 5,
    regenerationControls: {
      forcedBulletKeys: [],
      excludedBulletKeys: [],
      forcedEvidenceIds: [lowRankAdditionalId],
    },
  });
  const excludedAdditionalSpine = buildEvidenceSpine({
    collated: manyAdditionalCollated,
    enrichment: categoryEnrichment,
    jdText: categoryJdText,
    maxWorkBullets: 5,
    regenerationControls: {
      forcedBulletKeys: [],
      excludedBulletKeys: [],
      excludedEvidenceIds: [additionalEvidenceId("add-0")],
    },
  });
  const forcedAdditionalPayload = buildResumeDraftGenerationInput({
    collated: manyAdditionalCollated,
    enrichment: categoryEnrichment,
    jobDescription: {
      id: "jd-cat",
      rawText: categoryJdText,
      roleTitle: "Product Lead",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    referenceResume: {
      id: "resume-1",
      filename: "resume.docx",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      workExperiences: [],
      education: [],
      additionalExperience: {
        id: "add-section",
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
        technicalSkills: [],
        interests: [],
        other: [],
        rawText: "",
        parseWarnings: [],
      },
      unparsedSections: [],
      parseWarnings: [],
    },
    maxBullets: 5,
    regenerationControls: {
      forcedBulletKeys: [],
      excludedBulletKeys: [],
      forcedEvidenceIds: [lowRankAdditionalId],
    },
  });
  const excludedAdditionalPayload = buildResumeDraftGenerationInput({
    collated: manyAdditionalCollated,
    enrichment: categoryEnrichment,
    jobDescription: {
      id: "jd-cat",
      rawText: categoryJdText,
      roleTitle: "Product Lead",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    referenceResume: {
      id: "resume-1",
      filename: "resume.docx",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      workExperiences: [],
      education: [],
      additionalExperience: {
        id: "add-section",
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
        technicalSkills: [],
        interests: [],
        other: [],
        rawText: "",
        parseWarnings: [],
      },
      unparsedSections: [],
      parseWarnings: [],
    },
    maxBullets: 5,
    regenerationControls: {
      forcedBulletKeys: [],
      excludedBulletKeys: [],
      excludedEvidenceIds: [additionalEvidenceId("add-0")],
    },
  });
  const additionalAddList = buildAddEvidenceList(
    categorySpine,
    emptyDraftContent,
    undefined,
  );
  const additionalRow = additionalAddList.find((row) => row.sourceType === "additional_experience");
  const additionalQueueSummary = buildEvidenceQueueSummary(
    [
      {
        id: "include:add-line-1",
        type: "include_on_full_regenerate",
        evidenceId: additionalEvidenceId("add-line-1"),
        label: "Pilot project",
      },
    ],
    0,
  );
  const legacyControlsSnapshot = buildResumeDraftGenerationInput({
    collated: categoryCollated,
    enrichment: categoryEnrichment,
    jobDescription: {
      id: "jd-cat",
      rawText: categoryJdText,
      roleTitle: "Product Lead",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    referenceResume: {
      id: "resume-1",
      filename: "resume.docx",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      workExperiences: [],
      education: [],
      additionalExperience: {
        id: "add-section",
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
        technicalSkills: [],
        interests: [],
        other: [],
        rawText: "",
        parseWarnings: [],
      },
      unparsedSections: [],
      parseWarnings: [],
    },
    maxBullets: 5,
    regenerationControls: {
      forcedBulletKeys: [workBulletKey],
      excludedBulletKeys: [],
    },
  });

  const checks: [string, boolean][] = [
    [
      "Case A: forced bullet outside top rank enters payload with force",
      forcedOutsideTopRank,
    ],
    [
      "Case A: forced bullet survives structure repair",
      forcedSurvivesRepair,
    ],
    [
      "Case B: already-in-payload keys detected",
      alreadyInPayload.length === 1,
    ],
    [
      "Case C: unavailable forced key explains exclusion reason",
      unavailableEntries[0]?.reason === "excluded" &&
        unavailableEntries[0]?.message.includes("Excluded from regeneration"),
    ],
    [
      "Case D: repair trims non-forced bullets before forced bullet",
      repairInput.experience[0]!.bullets.length === 6 &&
        repaired.content.experience[0]!.bullets.length <= TARGET_TOTAL_WORK_BULLETS_MAX + 1 &&
        forcedSurvivesRepair,
    ],
    [
      "Case E: unchanged regeneration outcome summary mentions zero changes",
      outcomeUnchanged.lines.some((line) => line.includes("0 work experience bullets changed")),
    ],
    [
      "prompt includes forced bullet enforcement section",
      promptIncludesForcedBulletRules(prompt) && promptIncludesWorkExperienceBulletRules(prompt),
    ],
    [
      "validation warns when forced bullet missing from output",
      missingWarnings.some((entry) => entry.code === "forced_bullet_missing_from_output"),
    ],
    [
      "prepare stores forced bullet audit metadata",
      Boolean(preparedWithForced.forcedBulletAudit?.requestedKeys.includes(forcedKey)),
    ],
    [
      "prepare warns on unavailable forced keys without hard failing",
      preparedWithForced.validation.ok &&
        preparedWithForced.validation.warnings.some(
          (entry) => entry.code === "forced_bullet_unavailable",
        ),
    ],
    [
      "payload helper collects generation bullet keys",
      collectPayloadBulletKeys(buildGenerationInputWithForced()).size === 0,
    ],
    [
      "targeted plan maps forced bullet to existing role",
      targetedPlan.mode === "targeted" && targetedPlan.roles.length === 1,
    ],
    [
      "targeted rewrite preserves unrelated roles",
      patchedContent.experience[1]?.bullets[0]?.text === targetedContent.experience[1]?.bullets[0]?.text,
    ],
    [
      "mock targeted rewrite includes forced bullet sourceRef",
      mockRoleRewrite.bullets.some((bullet) =>
        bullet.sourceRefs.some((ref) => ref.bulletKey === forcedKey),
      ),
    ],
    [
      "multiple forced keys same role produce one targeted plan item",
      multiKeyPlan.mode === "targeted" && multiKeyPlan.roles.length === 1,
    ],
    [
      "absent role blocked from targeted rewrite",
      absentRolePlan.mode === "blocked" &&
        absentRolePlan.message === TARGETED_REWRITE_BLOCKED_MESSAGE,
    ],
    [
      "invalid targeted rewrite validation fails before overwrite",
      invalidRoleIssues.some((issue) => issue.includes("at least 2 bullets")),
    ],
    [
      "approved draft becomes layout_changed after targeted rewrite",
      resolveDraftStatusAfterTargetedRewrite(RESUME_DRAFT_STATUS_APPROVED) ===
        RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
    ],
    [
      "role rewrite prompt includes scoped instructions",
      promptIncludesRoleRewriteScopeRules(roleRewritePrompt),
    ],
    [
      "regeneration panel exposes apply and full actions",
      regenerationPanel.includes("Apply evidence changes") &&
        regenerationPanel.includes("Regenerate full resume"),
    ],
    [
      "dedicated role rewrite route exists",
      roleRewriteRoute.includes("rewriteResumeRoleWithAI"),
    ],
    [
      "resume custom revision route exists",
      resumeCustomRevisionRoute.includes("reviseResumeScopeWithAI"),
    ],
    [
      "resume batch revision route exists",
      resumeCustomRevisionRoute.includes("reviseResumeBatchWithAI"),
    ],
    [
      "custom role revision prompt is scoped",
      promptIncludesRoleCustomRevisionScope(customRolePrompt),
    ],
    [
      "custom role revision validation rejects empty bullets",
      validateCustomRevisedRoleBullets({
        bullets: [],
        priorRole: targetedContent.experience[0]!,
      }).some((issue) => issue.includes("at least")),
    ],
    [
      "add evidence list includes work additional education skill keyword categories",
      categoryLabels.has("Work") &&
        categoryLabels.has("Additional") &&
        categoryLabels.has("Education") &&
        categoryLabels.has("Skill") &&
        categoryLabels.has("Keyword"),
    ],
    [
      "add evidence list sorted by relevance score descending",
      listMatchesRelevanceSort,
    ],
    [
      "excluded work bullet omitted from add evidence list",
      !excludedAddList.some((row) => row.bulletKey === workBulletKey),
    ],
    [
      "hidden work bullet omitted from add evidence list",
      !hiddenAddList.some((row) => row.bulletKey === workBulletKey),
    ],
    [
      "work bullets remain addable in category-aware list",
      workAddableRows.some((row) => row.bulletKey === workBulletKey),
    ],
    [
      "keywords are advisory only in add evidence list",
      keywordRows.length > 0 && keywordRows.every((row) => row.actionState === "advisory_only"),
    ],
    [
      "non-work evidence ids do not produce targeted rewrite plan",
      nonWorkTargetedPlan.mode === "blocked" || nonWorkTargetedPlan.mode === "none",
    ],
    [
      "regeneration panel uses ranked add evidence list",
      regenerationPanel.includes("add-evidence-ranked-list") &&
        regenerationPanel.includes("buildAddEvidenceList"),
    ],
    [
      "forced additional outside ranked slice enters generation payload",
      !baselineAdditionalSpine.additionalIds.includes("add-7") &&
        forcedAdditionalSpine.additionalIds.includes("add-7") &&
        forcedAdditionalPayload.additionalExperience.some((item) =>
          item.text.includes("Routine community outreach"),
        ),
    ],
    [
      "excluded additional omitted from generation payload",
      excludedAdditionalSpine.additionalIds.includes("add-0") === false &&
        !excludedAdditionalPayload.additionalExperience.some((item) =>
          item.text.includes("Blockchain fintech pilot initiative 0"),
        ),
    ],
    [
      "additional rows are full regenerate only in add evidence list",
      Boolean(additionalRow) && additionalRow?.actionState === "full_regenerate_only",
    ],
    [
      "pending queue states additional inclusion requires full regeneration",
      additionalQueueSummary.summaryLines.some((line) =>
        line.includes("full regeneration"),
      ) && additionalQueueSummary.hasGeminiWork === false,
    ],
    [
      "regeneration panel stages additional inclusion without targeted rewrite",
      regenerationPanel.includes("stage-include-additional-on-regenerate") &&
        regenerationPanel.includes("Include on full regeneration"),
    ],
    [
      "legacy regeneration controls without evidence ids still build payload",
      legacyControlsSnapshot.regenerationControls?.forcedBulletKeys.includes(workBulletKey) &&
        !legacyControlsSnapshot.regenerationControls?.forcedEvidenceIds,
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll forced bullet regeneration checks passed.");
}

main();
