import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import {
  buildResumeDraftPrompt,
  promptIncludesAdditionalExperienceColonFormat,
  promptIncludesJdAnalysisGuardrails,
} from "../src/lib/resume-draft/prompt";
import {
  assertGeneratedResumeContentValid,
  MAX_BULLETS_PER_ROLE,
  MAX_WORK_EXPERIENCE_ROLES,
  MIN_BULLETS_PER_ROLE,
  validateGeneratedResumeContent,
} from "../src/lib/resume-draft/generation-validation";
import { parseAdditionalExperienceItemText } from "../src/lib/resume-draft/layout";
import { createGeneratedResumeDraftInCloud, updateGeneratedResumeDraftInCloud } from "../src/lib/supabase/generated-resume-drafts";
import type { ResumeDraftContent } from "../src/types/resume-draft";
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
  const invalidResult = validateGeneratedResumeContent(invalidDraft);

  let assertFailed = false;
  try {
    assertGeneratedResumeContentValid(invalidDraft);
  } catch {
    assertFailed = true;
  }

  const parsedAdditional = parseAdditionalExperienceItemText(
    "Other Past Roles: BayCurrent Consulting – Enterprise Blockchain (Japan)",
  );

  const checks: [string, boolean][] = [
    ["prompt includes JD analysis guardrails", promptIncludesJdAnalysisGuardrails(prompt)],
    ["prompt includes additional experience colon format", promptIncludesAdditionalExperienceColonFormat(prompt)],
    ["mock draft passes validation", validateGeneratedResumeContent(mockDraft.content).ok],
    ["invalid draft fails validation", !invalidResult.ok],
    ["invalid draft flags too many roles", invalidResult.errors.some((issue) => issue.code === "too_many_roles")],
    ["invalid draft flags bullet count", invalidResult.errors.some((issue) => issue.code === "role_bullet_count")],
    ["invalid draft flags additional format", invalidResult.errors.some((issue) => issue.code === "additional_experience_format")],
    ["assertGeneratedResumeContentValid throws", assertFailed],
    ["additional experience parser accepts title detail", parsedAdditional?.title === "Other Past Roles"],
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
