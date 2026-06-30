import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import {
  buildResumeDraftPrompt,
  promptIncludesAdditionalExperienceColonFormat,
  promptIncludesAntiGenericLanguageRules,
  promptIncludesJdAnalysisGuardrails,
  promptIncludesJdReframingRules,
  promptIncludesRationaleQualityRules,
  promptIncludesSkillsInterestsStructure,
  promptIncludesAcceptedWordingRules,
  promptIncludesKeywordDistinctionRules,
  promptIncludesSourceRefsRules,
  promptUsesCompactJsonPayload,
} from "../../src/lib/resume-draft/prompt";
import {
  DEFAULT_ADDITIONAL_EXPERIENCE_TITLE,
  normalizeAdditionalExperienceItems,
  parseAdditionalExperienceItemText,
} from "../../src/lib/resume-draft/additional-experience";
import {
  assertGeneratedResumeContentValid,
  MAX_BULLETS_PER_ROLE,
  MAX_WORK_EXPERIENCE_ROLES,
  MIN_BULLETS_PER_ROLE,
  prepareGeneratedResumeContent,
  validateGeneratedResumeContent,
} from "../../src/lib/resume-draft/generation-validation";
import { buildAdditionalExperienceEntries } from "../../src/lib/resume-draft/layout";
import {
  areNearDuplicateBullets,
  extractMetrics,
  findUnsupportedMetrics,
  validateTailoringQuality,
} from "../../src/lib/resume-draft/tailoring-quality";
import { createGeneratedResumeDraftInCloud, updateGeneratedResumeDraftInCloud } from "../../src/lib/supabase/generated-resume-drafts";
import type { ResumeDraftContent, ResumeDraftExperienceBullet } from "../../src/types/resume-draft";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";

const sampleJd: StoredJobDescription = {
  id: "jd-1",
  rawText: "Looking for a product manager with operations and strategy experience.",
  companyName: "Acme",
  roleTitle: "Product Manager",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const PLAIN_ADDITIONAL_EXPERIENCE_EXAMPLES = [
  "Acme Consulting – Enterprise Systems Integration",
  "Growth Labs – Founder Sprint Weekend",
  "CareOps – Strategy & Operations, primary care",
  "BuildCo – Product & Engineering (Remote)",
  "Delta Consulting – Strategy & Operations",
];

function buildInventory(): InventoryState {
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
          lines: ["Volunteer tutor"],
          rawText: "Volunteer tutor",
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

function sampleBullet(text: string): ResumeDraftExperienceBullet {
  return {
    text,
    sourceRefs: [{ resumeId: "resume-1", bulletKey: "bullet-1" }],
    confidence: "medium",
    riskFlags: [],
  };
}

function buildValidDraftSkeleton(
  additionalExperience: ResumeDraftContent["additionalExperience"],
): ResumeDraftContent {
  return {
    schemaVersion: 1,
    header: { includeHeader: false },
    professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
    skills: {
      groups: [
        { label: "Skills", items: ["SQL", "Python"] },
        { label: "Languages", items: ["English"] },
        { label: "Interests", items: ["Reading"] },
      ],
      jdAlignment: [],
      riskFlags: [],
    },
    experience: [
      {
        company: "Acme",
        role: "PM",
        bullets: [
          sampleBullet("Ops: Led product operations"),
          sampleBullet("Strategy: Drove quarterly planning"),
        ],
        riskFlags: [],
      },
    ],
    education: [],
    additionalExperience,
    globalRiskFlags: [],
  };
}

function buildInvalidDraft(): ResumeDraftContent {
  return {
    schemaVersion: 1,
    header: { includeHeader: false },
    professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
    skills: {
      groups: [{ label: "Skills", items: ["SQL"] }],
      jdAlignment: [],
      riskFlags: [],
    },
    experience: [
      {
        company: "Acme",
        role: "PM",
        bullets: [
          { text: "Ops: Did work", sourceRefs: [], confidence: "medium" as const, riskFlags: [] },
        ],
        riskFlags: [],
      },
      {
        company: "Beta",
        role: "PM",
        bullets: [
          { text: "Ops: Did work", sourceRefs: [], confidence: "medium" as const, riskFlags: [] },
        ],
        riskFlags: [],
      },
      {
        company: "Gamma",
        role: "PM",
        bullets: [
          { text: "Ops: Did work", sourceRefs: [], confidence: "medium" as const, riskFlags: [] },
        ],
        riskFlags: [],
      },
      {
        company: "Delta",
        role: "PM",
        bullets: [
          { text: "Ops: Did work", sourceRefs: [], confidence: "medium" as const, riskFlags: [] },
        ],
        riskFlags: [],
      },
      {
        company: "Epsilon",
        role: "PM",
        bullets: [
          { text: "Ops: Did work", sourceRefs: [], confidence: "medium" as const, riskFlags: [] },
        ],
        riskFlags: [],
      },
    ],
    education: [],
    additionalExperience: [{ text: "Volunteer tutor", riskFlags: [] }],
    globalRiskFlags: [],
  };
}

function main() {
  const inventory = buildInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0]!,
  });
  const prompt = buildResumeDraftPrompt(generationInput);
  const mockDraft = generateMockResumeDraft(generationInput);
  const invalidDraft = buildInvalidDraft();
  const invalidPrepared = prepareGeneratedResumeContent(invalidDraft, {
    jdText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const plainExamplesDraft = buildValidDraftSkeleton(
    PLAIN_ADDITIONAL_EXPERIENCE_EXAMPLES.map((text) => ({ text, riskFlags: [] })),
  );
  const plainExamplesPrepared = prepareGeneratedResumeContent(plainExamplesDraft);

  const normalizedPlain = normalizeAdditionalExperienceItems(
    PLAIN_ADDITIONAL_EXPERIENCE_EXAMPLES.map((text) => ({ text, riskFlags: [] })),
  );
  const normalizedPlainText = normalizedPlain[0]?.text ?? "";
  const normalizedMixed = normalizeAdditionalExperienceItems([
    { text: "Board Advisor: Acme Corp", riskFlags: [] },
    { text: "Acme Consulting – Enterprise Systems Integration", riskFlags: [] },
    { text: "Growth Labs – Founder Sprint Weekend", riskFlags: [] },
  ]);
  const normalizedVolunteer = normalizeAdditionalExperienceItems([
    { text: "Volunteer tutor", riskFlags: [] },
  ]);

  let repairedDraftAccepted = true;
  try {
    assertGeneratedResumeContentValid(invalidPrepared.content);
  } catch {
    repairedDraftAccepted = false;
  }

  let plainExamplesAssertFailed = false;
  try {
    assertGeneratedResumeContentValid(plainExamplesDraft);
  } catch {
    plainExamplesAssertFailed = true;
  }

  const layoutEntries = buildAdditionalExperienceEntries(
    PLAIN_ADDITIONAL_EXPERIENCE_EXAMPLES.map((text) => ({ text, riskFlags: [] })),
  );

  const parsedAdditional = parseAdditionalExperienceItemText(
    "Other Past Roles: Acme Consulting – Enterprise Systems Integration",
  );

  const metricSource = "Managed S$200k monthly cash reconciliation";
  const metricPreserved = findUnsupportedMetrics(
    "Cash Ops: Managed S$200k monthly cash reconciliation for APAC",
    [metricSource],
  );
  const metricInvented = findUnsupportedMetrics(
    "Cash Ops: Managed S$500k monthly cash reconciliation for APAC",
    [metricSource],
  );
  const duplicateWarnings = validateTailoringQuality(
    {
      ...buildValidDraftSkeleton([]),
      experience: [
        {
          company: "Acme",
          role: "PM",
          bullets: [
            sampleBullet("Ops: Led product operations improvements across teams"),
            sampleBullet("Operations: Led product operations improvements across teams"),
            sampleBullet("Strategy: Drove quarterly planning"),
          ],
          riskFlags: [],
        },
      ],
    },
    {
      rationale: {
        overall: "Strong alignment with proven track record leveraging stakeholder management.",
        omissions: [],
        keywordUsage: [],
      },
    },
  );

  const checks: [string, boolean][] = [
    ["prompt includes JD reframing rules", promptIncludesJdReframingRules(prompt)],
    ["prompt includes anti-generic language rules", promptIncludesAntiGenericLanguageRules(prompt)],
    ["prompt includes rationale quality rules", promptIncludesRationaleQualityRules(prompt)],
    ["prompt includes JD analysis guardrails", promptIncludesJdAnalysisGuardrails(prompt)],
    ["prompt includes additional experience colon format", promptIncludesAdditionalExperienceColonFormat(prompt)],
    ["prompt includes skills interests structure", promptIncludesSkillsInterestsStructure(prompt)],
    ["prompt includes accepted wording rules", promptIncludesAcceptedWordingRules(prompt)],
    ["prompt includes keyword distinction rules", promptIncludesKeywordDistinctionRules(prompt)],
    ["prompt includes sourceRefs rules", promptIncludesSourceRefsRules(prompt)],
    ["prompt uses compact json payload", promptUsesCompactJsonPayload(prompt)],
    ["mock draft passes validation", validateGeneratedResumeContent(mockDraft.content).ok],
    ["invalid draft is valid after required skill groups are repaired", invalidPrepared.validation.ok],
    [
      "invalid draft repairs excess roles before skills check",
      invalidPrepared.content.experience.length === MAX_WORK_EXPERIENCE_ROLES,
    ],
    [
      "invalid draft no longer flags too many roles as hard error",
      !invalidPrepared.validation.errors.some((issue) => issue.code === "too_many_roles"),
    ],
    [
      "invalid draft repair restores all required skill groups",
      !invalidPrepared.validation.errors.some((issue) => issue.code === "skills_group_missing") &&
        invalidPrepared.content.skills.groups.length >= 3,
    ],
    [
      "invalid draft does not flag additional format after normalization",
      !invalidPrepared.validation.errors.some((issue) => issue.code === "additional_experience_format"),
    ],
    ["plain volunteer item normalizes to Other Past Roles", normalizedVolunteer.length === 1],
    [
      "plain volunteer item uses Title: Detail",
      normalizedVolunteer[0]?.text === `${DEFAULT_ADDITIONAL_EXPERIENCE_TITLE}: Volunteer tutor`,
    ],
    ["plain examples combine into one item", normalizedPlain.length === 1],
    [
      "plain examples combine under Other Past Roles",
      normalizedPlainText.startsWith(`${DEFAULT_ADDITIONAL_EXPERIENCE_TITLE}:`),
    ],
    [
      "plain examples include all listed roles",
      PLAIN_ADDITIONAL_EXPERIENCE_EXAMPLES.every((example) => normalizedPlainText.includes(example)),
    ],
    ["mixed items preserve colon format entry", normalizedMixed.some((item) => item.text.startsWith("Board Advisor:"))],
    [
      "mixed items combine plain roles under Other Past Roles",
      normalizedMixed.some((item) => item.text.startsWith(`${DEFAULT_ADDITIONAL_EXPERIENCE_TITLE}:`)),
    ],
    ["listed plain examples pass generation validation", plainExamplesPrepared.validation.ok],
    ["listed plain examples do not throw assert", !plainExamplesAssertFailed],
    [
      "listed plain examples emit normalization warning",
      plainExamplesPrepared.validation.warnings.some((issue) => issue.code === "additional_experience_normalized"),
    ],
    ["assertGeneratedResumeContentValid accepts repaired draft", repairedDraftAccepted],
    ["additional experience parser accepts title detail", parsedAdditional?.title === "Other Past Roles"],
    ["layout renders plain examples as Title: Detail", layoutEntries.length === 1 && layoutEntries[0]?.title === DEFAULT_ADDITIONAL_EXPERIENCE_TITLE],
    ["max roles constant is 4", MAX_WORK_EXPERIENCE_ROLES === 4],
    ["bullet bounds 2-4", MIN_BULLETS_PER_ROLE === 2 && MAX_BULLETS_PER_ROLE === 4],
    ["metric preserved when unchanged in output", metricPreserved.length === 0],
    ["invented metric detected against source", metricInvented.includes("s$500k")],
    ["near duplicate bullets detected", areNearDuplicateBullets(
      "Ops: Led product operations improvements across teams",
      "Operations: Led product operations improvements across teams",
    )],
    [
      "tailoring validation flags generic rationale and near duplicates",
      duplicateWarnings.some((issue) => issue.code === "generic_rationale_phrase") &&
        duplicateWarnings.some((issue) => issue.code === "near_duplicate_bullets"),
    ],
    [
      "extract metrics from inventory text",
      extractMetrics(metricSource).some((metric) => metric.includes("200k")),
    ],
    [
      "draft cloud helpers use update not insert for layout edits",
      updateGeneratedResumeDraftInCloud.toString().includes(".update(") &&
        !updateGeneratedResumeDraftInCloud.toString().includes(".insert(") &&
        createGeneratedResumeDraftInCloud.toString().includes(".insert("),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume generation validation checks passed.");
}

main();
