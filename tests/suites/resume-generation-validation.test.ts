import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import {
  buildResumeDraftPrompt,
  promptIncludesAdditionalExperienceColonFormat,
  promptIncludesJdAnalysisGuardrails,
  promptIncludesSkillsInterestsStructure,
  promptIncludesAcceptedWordingRules,
  promptIncludesKeywordDistinctionRules,
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

  let assertFailed = false;
  try {
    assertGeneratedResumeContentValid(invalidDraft);
  } catch {
    assertFailed = true;
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

  const checks: [string, boolean][] = [
    ["prompt includes JD analysis guardrails", promptIncludesJdAnalysisGuardrails(prompt)],
    ["prompt includes additional experience colon format", promptIncludesAdditionalExperienceColonFormat(prompt)],
    ["prompt includes skills interests structure", promptIncludesSkillsInterestsStructure(prompt)],
    ["prompt includes accepted wording rules", promptIncludesAcceptedWordingRules(prompt)],
    ["prompt includes keyword distinction rules", promptIncludesKeywordDistinctionRules(prompt)],
    ["mock draft passes validation", validateGeneratedResumeContent(mockDraft.content).ok],
    ["invalid draft still missing skills after repair", !invalidPrepared.validation.ok],
    [
      "invalid draft repairs excess roles before skills check",
      invalidPrepared.content.experience.length === MAX_WORK_EXPERIENCE_ROLES,
    ],
    [
      "invalid draft no longer flags too many roles as hard error",
      !invalidPrepared.validation.errors.some((issue) => issue.code === "too_many_roles"),
    ],
    [
      "invalid draft still flags missing skills groups",
      invalidPrepared.validation.errors.some((issue) => issue.code === "skills_group_missing"),
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
    ["assertGeneratedResumeContentValid throws on invalid draft", assertFailed],
    ["additional experience parser accepts title detail", parsedAdditional?.title === "Other Past Roles"],
    ["layout renders plain examples as Title: Detail", layoutEntries.length === 1 && layoutEntries[0]?.title === DEFAULT_ADDITIONAL_EXPERIENCE_TITLE],
    ["max roles constant is 4", MAX_WORK_EXPERIENCE_ROLES === 4],
    ["bullet bounds 2-4", MIN_BULLETS_PER_ROLE === 2 && MAX_BULLETS_PER_ROLE === 4],
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
