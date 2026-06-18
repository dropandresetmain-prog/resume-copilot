import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState, upsertKeywordBankItem } from "../src/lib/enrichment/state";
import {
  buildResumeDraftGenerationInput,
  buildResumeDraftPayloadFromInventory,
  filterApprovedKeywords,
  summarizeResumeDraftContent,
} from "../src/lib/resume-draft/payload";
import {
  buildResumeDraftPrompt,
  promptIncludesJsonSchemaInstructions,
} from "../src/lib/resume-draft/prompt";
import {
  mapResumeDraftPayload,
  parseResumeDraftJson,
} from "../src/lib/resume-draft/parse";
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

function buildInventoryWithApprovedKeywords(): InventoryState {
  let keywordBank = createEmptyEnrichmentState().keywordBank;
  keywordBank = upsertKeywordBankItem(keywordBank, "Product Operations", "ai_suggested", true);
  keywordBank = upsertKeywordBankItem(keywordBank, "Strategic Planning", "ai_suggested", false);

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
        unparsedSections: [
          {
            id: "unparsed-1",
            sourceResumeId: "resume-1",
            title: "Document preamble",
            originalHeader: "Document preamble",
            lines: ["John Doe", "john@example.com"],
            rawText: "John Doe\njohn@example.com",
            parseWarnings: [],
          },
        ],
        parseWarnings: [],
      },
    ],
    failures: [],
    enrichment: {
      ...createEmptyEnrichmentState(),
      keywordBank,
    },
  };
}

const inventory = buildInventoryWithApprovedKeywords();
const collated = buildCollatedInventory(inventory);
const generationInput = buildResumeDraftGenerationInput({
  collated,
  enrichment: inventory.enrichment,
  jobDescription: sampleJd,
  referenceResume: inventory.resumes[0],
});
const prompt = buildResumeDraftPrompt(generationInput);
const mockDraft = generateMockResumeDraft(generationInput);
const serializedBefore = JSON.stringify(inventory);

const payloadBundle = buildResumeDraftPayloadFromInventory({
  inventory,
  jobDescription: sampleJd,
  referenceResumeId: inventory.resumes[0].id,
});

const validJson = JSON.stringify({
  schemaVersion: 1,
  targetRoleTitle: "Product Manager",
  header: { includeHeader: false },
  professionalSummary: { text: "Summary", jdAlignment: [], riskFlags: [] },
  skills: { groups: [{ label: "Skills", items: ["SQL"] }], jdAlignment: [], riskFlags: [] },
  experience: [
    {
      company: "Acme",
      role: "Product Manager",
      bullets: [
        {
          text: "Led product operations improvements",
          sourceRefs: [{ bulletKey: "acme::product manager::led product operations improvements" }],
          confidence: "high",
          riskFlags: [],
        },
      ],
      riskFlags: [],
    },
  ],
  education: [],
  additionalExperience: [],
  globalRiskFlags: [],
  rationale: {
    overall: "Used inventory bullets only.",
    omissions: [],
    keywordUsage: ["Product Operations"],
  },
});

const parsedValid = parseResumeDraftJson(validJson);
const parsedInvalid = parseResumeDraftJson("{ not-json");
const mapped = mapResumeDraftPayload(JSON.parse(validJson));
const serializedAfter = JSON.stringify(inventory);

const checks: [string, boolean][] = [
  ["approved keyword filter", filterApprovedKeywords(inventory.enrichment).length === 1],
  ["payload includes JD", generationInput.jobDescription.id === "jd-1"],
  ["payload includes reference resume", generationInput.referenceResume.resumeId === "resume-1"],
  [
    "payload includes bullet source citations",
    generationInput.experiences[0]?.bullets[0]?.sourceCitations.length === 1,
  ],
  [
    "snapshot has compact fields",
    payloadBundle.inputSnapshot.approvedKeywords.includes("Product Operations"),
  ],
  [
    "snapshot excludes full inventory",
    !JSON.stringify(payloadBundle.inputSnapshot).includes("workExperiences"),
  ],
  ["prompt includes JSON schema instructions", promptIncludesJsonSchemaInstructions(prompt)],
  ["parser accepts valid JSON", parsedValid.ok === true],
  ["parser rejects malformed JSON", parsedInvalid.ok === false],
  ["mapper handles optional fields", mapped.content.education.length === 0],
  ["mock draft has experience", mockDraft.content.experience.length > 0],
  ["summary helper works", summarizeResumeDraftContent(mockDraft.content).bulletCount > 0],
  ["inventory not mutated by builders", serializedBefore === serializedAfter],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} resume draft check(s) failed.`);
  process.exit(1);
}

console.log("\nAll resume draft checks passed.");
