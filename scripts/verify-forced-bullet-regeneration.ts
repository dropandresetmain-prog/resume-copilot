import { buildBulletEnrichmentKey } from "../src/lib/enrichment/keys";
import { selectGenerationBullets } from "../src/lib/resume-draft/bullet-payload";
import {
  auditForcedBullets,
  buildRegenerationOutcomeSummary,
  collectForcedKeysPresentInOutput,
  collectPayloadBulletKeys,
  explainUnavailableForcedKeys,
  findForcedKeysAlreadyInPayload,
  promptIncludesForcedBulletRules,
  validateForcedBulletsInOutput,
} from "../src/lib/resume-draft/forced-bullets";
import { buildResumeDraftPrompt, promptIncludesWorkExperienceBulletRules } from "../src/lib/resume-draft/prompt";
import {
  prepareGeneratedResumeContent,
  TARGET_TOTAL_WORK_BULLETS_MAX,
} from "../src/lib/resume-draft/generation-validation";
import { repairGeneratedResumeContent } from "../src/lib/resume-draft/repair-generated-content";
import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftGenerationInput,
} from "../src/types/resume-draft";
import type { CollatedExperience } from "../src/types/collated";

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
        keyword: "Operations",
        description:
          bulletIndex === 7 && index === 7
            ? "Built partner CRM automation workflows"
            : `Generic inventory bullet ${index}-${bulletIndex}`,
        rawTexts: [],
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

function main() {
  const jdText = "B2B sales CRM pipeline revenue growth stakeholder management";

  const rankedWithoutForce = selectGenerationBullets({
    experiences: buildManyInventoryExperiences(),
    maxBullets: 40,
    jdText,
    acceptedWordingByBulletKey: new Map(),
  });
  const rankedWithForce = selectGenerationBullets({
    experiences: buildManyInventoryExperiences(),
    maxBullets: 40,
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

  const prompt = buildResumeDraftPrompt(buildGenerationInputWithForced());

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
