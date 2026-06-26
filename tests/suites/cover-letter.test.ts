import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCoverLetter } from "../../src/lib/ai/cover-letter-mock";
import { buildCompanyContext, resolveCompanyNameForGeneration } from "../../src/lib/company-context/build-company-context";
import { buildCoverLetterEvidencePrompt } from "../../src/lib/cover-letter/evidence-prompt";
import { parseCoverLetterJson } from "../../src/lib/cover-letter/parse";
import {
  buildCoverLetterPrompt,
  promptIncludesCoverLetterRules,
  promptIncludesPunctuationRules,
  promptIncludesStorySpineRules,
} from "../../src/lib/cover-letter/prompt";
import { validateCoverLetterGenerationResult } from "../../src/lib/cover-letter/generation-validation";
import { buildResumeEvidenceSpine } from "../../src/lib/cover-letter/resume-evidence";
import { renderCoverLetterPdfHtml } from "../../src/lib/cover-letter/pdf-html";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { buildEvidenceSpine } from "../../src/lib/evidence/spine";
import { buildCoverLetterStorySpine } from "../../src/lib/evidence/story-spine";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";
import { RESUME_DRAFT_SCHEMA_VERSION } from "../../src/types/resume-draft";
import type { CollatedInventory } from "../../src/types/collated";
import type { GeneratedResumeDraftRecord } from "../../src/types/resume-draft";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";

function buildSampleResumeDraft(): GeneratedResumeDraftRecord {
  return {
    id: "resume-draft-1",
    userId: "user-1",
    jobDescriptionId: "jd-1",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: "Product Manager",
      header: { includeHeader: true, fullName: "Alex Tan" },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      experience: [
        {
          company: "Acme",
          role: "Product Manager",
          dateRange: "2024 - Present",
          bullets: [
            {
              text: "Led product operations and workflow automation initiatives.",
              sourceRefs: [],
              confidence: "high",
              riskFlags: [],
            },
          ],
          riskFlags: [],
        },
      ],
      education: [],
      additionalExperience: [],
      skills: { groups: [], jdAlignment: [], riskFlags: [] },
      globalRiskFlags: [],
    },
    status: "generated",
    schemaVersion: "1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function buildStorySpineCollated(): CollatedInventory {
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
            description: "Prepared internal reporting packs",
            rawTexts: ["Prepared internal reporting packs"],
            sourceCitations: [],
          },
        ],
      },
    ],
    educationItems: [],
    additionalExperienceItems: [
      {
        id: "add-line-1",
        category: "Projects",
        text: "Led blockchain fintech market entry pilot across APAC partners",
        rawTexts: ["Led blockchain fintech market entry pilot across APAC partners"],
        sourceCitations: [],
      },
    ],
    skillItems: [],
  };
}

function buildResumeDraftForStorySpine(): GeneratedResumeDraftRecord {
  return {
    id: "resume-draft-story",
    userId: "user-1",
    jobDescriptionId: "jd-blockchain",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: "Product Lead",
      header: { includeHeader: true, fullName: "Alex Tan" },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      experience: [
        {
          company: "Legacy Corp",
          role: "Analyst",
          dateRange: "2020 - 2021",
          bullets: [
            {
              text: "Prepared internal reporting packs",
              sourceRefs: [],
              confidence: "high",
              riskFlags: [],
            },
          ],
          riskFlags: [],
        },
      ],
      education: [],
      additionalExperience: [],
      skills: { groups: [], jdAlignment: [], riskFlags: [] },
      globalRiskFlags: [],
    },
    status: "generated",
    schemaVersion: "1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function buildStorySpineJob(): StoredJobDescription {
  return {
    id: "jd-blockchain",
    rawText:
      "Product leader with blockchain fintech market entry, platform operations, and stakeholder leadership.",
    companyName: "FinCo",
    roleTitle: "Product Lead",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function main() {
  const resumeDraft = buildSampleResumeDraft();
  const companyContext = buildCompanyContext({
    companyName: "Pave Bank",
    country: "Singapore",
    website: "https://pavebank.com",
    jobDescriptionText: "Product Manager at Pave Bank. Payments and operations.",
  });
  const input = {
    jobDescription: {
      id: "jd-1",
      rawText: "Product Manager at Pave Bank. Payments and operations.",
      companyName: "Pave Bank",
      roleTitle: "Product Manager",
    },
    resumeDraftId: resumeDraft.id,
    resumeEvidenceSpine: buildResumeEvidenceSpine(resumeDraft),
    communicationProfile: "Strategy & Operations background.",
    companyName: "Pave Bank",
    country: "Singapore",
    companyWebsite: "https://pavebank.com",
    companyContext,
  };

  const mock = generateMockCoverLetter(input);
  const prompt = buildCoverLetterPrompt(input);
  const validation = validateCoverLetterGenerationResult(mock);
  const parsed = parseCoverLetterJson(
    JSON.stringify({
      formalCoverLetter: { content: mock.formalContent, wordCount: mock.rationale.wordCount },
      emailCoverLetter: { content: mock.rationale.emailCoverLetter },
      linkedinMessage: { content: mock.rationale.linkedinMessage },
      recruiterDm: { content: mock.rationale.recruiterDm },
      whatsappIntro: { content: mock.rationale.whatsappIntro },
      rationale: {
        selectedThemes: mock.rationale.selectedThemes,
        whyTheseThemes: mock.rationale.whyTheseThemes,
        companyContextUsed: mock.rationale.companyContextUsed,
        riskFlags: mock.rationale.riskFlags,
      },
    }),
  );

  const profilePage = readFileSync(
    join(process.cwd(), "src/components/pages/ProfilePageClient.tsx"),
    "utf8",
  );
  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const coverPreview = readFileSync(
    join(process.cwd(), "src/components/pages/CoverLetterPreviewPageClient.tsx"),
    "utf8",
  );
  const schema = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");

  const storyJob = buildStorySpineJob();
  const storyResumeDraft = buildResumeDraftForStorySpine();
  const storyCollated = buildStorySpineCollated();
  const storyCompanyContext = buildCompanyContext({
    companyName: "FinCo",
    country: "Singapore",
    jobDescriptionText: storyJob.rawText,
  });
  const storySpineEvidence = buildEvidenceSpine({
    collated: storyCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
    maxWorkBullets: 5,
    companyContext: storyCompanyContext,
  });
  const storySpine = buildCoverLetterStorySpine({
    spine: storySpineEvidence,
    companyContext: storyCompanyContext,
    resumeDraft: storyResumeDraft,
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
    companyDisplayName: "FinCo",
  });
  const storyPromptInput = {
    ...input,
    resumeEvidenceSpine: buildCoverLetterEvidencePrompt({
      inventory: {
        resumes: [
          {
            id: "resume-1",
            filename: "resume.docx",
            uploadedAt: "2025-01-01T00:00:00.000Z",
            workExperiences: [
              {
                id: "exp-low",
                company: "Legacy Corp",
                role: "Analyst",
                dateRange: "2020 - 2021",
                bullets: [
                  {
                    id: "low-bullet",
                    description: "Prepared internal reporting packs",
                    rawTexts: ["Prepared internal reporting packs"],
                    sourceCitations: [],
                  },
                ],
                sourceCitations: [],
                parseWarnings: [],
              },
            ],
            education: [],
            additionalExperience: {
              id: "add-1",
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
        ],
        enrichment: createEmptyEnrichmentState(),
        edits: {
          ...createEmptyInventoryEdits(),
          addedAdditionalExperienceItems: [
            {
              id: "add-overlay-1",
              text: "Led blockchain fintech market entry pilot across APAC partners",
              category: "Projects",
              addedAt: "2025-01-01T00:00:00.000Z",
            },
          ],
        },
      } satisfies InventoryState,
      resumeDraft: storyResumeDraft,
      job: storyJob,
      companyContext: storyCompanyContext,
      companyDisplayName: "FinCo",
    }).resumeEvidenceSpine,
  };
  const storyPrompt = buildCoverLetterPrompt(storyPromptInput);
  const hiddenBulletKey = buildBulletEnrichmentKey(
    "Legacy Corp",
    "Analyst",
    "Prepared internal reporting packs",
  );
  const hiddenSpine = buildEvidenceSpine({
    collated: storyCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: storyJob.rawText,
    maxWorkBullets: 5,
    regenerationControls: {
      forcedBulletKeys: [],
      excludedBulletKeys: [hiddenBulletKey],
    },
  });
  const hiddenStorySpine = buildCoverLetterStorySpine({
    spine: hiddenSpine,
    companyContext: storyCompanyContext,
    resumeDraft: storyResumeDraft,
    jdText: storyJob.rawText,
  });
  const coverLetterGenerationSource = readFileSync(
    join(process.cwd(), "src/lib/generate/cover-letter-generation.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["company context builder sets confidence", companyContext.confidence === "medium"],
    ["resolve company name prefers override", resolveCompanyNameForGeneration({ override: "Beta Co", jobDescriptionText: "at Alpha" }) === "Beta Co"],
    ["resume evidence spine includes bullet", input.resumeEvidenceSpine.includes("workflow automation")],
    ["prompt includes cover letter rules", promptIncludesCoverLetterRules(prompt)],
    ["prompt includes punctuation rules", promptIncludesPunctuationRules(prompt)],
    ["prompt does not hardcode founder name", !prompt.includes("Min Htet")],
    ["mock formal content present", mock.formalContent.length > 0],
    ["mock secondary email present", mock.rationale.emailCoverLetter.length > 0],
    ["validation accepts mock formal letter", validation.ok],
    ["parser accepts formal cover letter json", parsed.ok === true],
    ["pdf html renders paragraphs", renderCoverLetterPdfHtml("Dear Hiring Manager,\n\nBody.").includes("<p>")],
    ["profile page saves communication profile", profilePage.includes("saveApplicationCommunicationProfileToCloud")],
    ["generate supports combined mode", generateSection.includes("resume_and_cover_letter")],
    ["generate wires cover letter save", generateSection.includes("generateAndSaveCoverLetterDraft")],
    ["cover preview supports docx/pdf export", coverPreview.includes("DownloadCoverLetterPdfButton") && coverPreview.includes("DownloadCoverLetterDocxButton")],
    ["schema mentions communication profiles", schema.includes("application_communication_profiles") || readFileSync(join(process.cwd(), "supabase/migrations/20260622_application_communication_v090.sql"), "utf8").includes("application_communication_profiles")],
    [
      "story spine includes inventory proof not on resume draft",
      storySpine.proofStories.some(
        (story) =>
          story.groundedText.includes("blockchain fintech market entry") && !story.onResumeDraft,
      ),
    ],
    [
      "story prompt includes inventory proof not on resume",
      storyPrompt.includes("blockchain fintech market entry") &&
        storyPrompt.includes("NOT on resume draft"),
    ],
    [
      "story prompt labels resume draft as consistency reference",
      storyPrompt.includes("consistency reference only"),
    ],
    [
      "story spine includes honest gaps when jd unsupported",
      storySpine.honestGaps.some((gap) => gap.includes("JD asks for")),
    ],
    [
      "story spine includes avoid overclaim for company context",
      storySpine.avoidOverclaim.some((note) => note.toLowerCase().includes("framing only")),
    ],
    [
      "excluded inventory evidence omitted from story spine proof",
      !hiddenStorySpine.proofStories.some((story) => story.groundedText.includes("internal reporting packs")),
    ],
    ["prompt includes story spine rules", promptIncludesStorySpineRules(storyPrompt)],
    [
      "cover letter generation uses inventory evidence prompt builder",
      coverLetterGenerationSource.includes("buildCoverLetterEvidencePrompt"),
    ],
    [
      "cover letter generation does not add extra ai calls",
      !coverLetterGenerationSource.includes("generateCoverLetterWithAI") &&
        coverLetterGenerationSource.includes("requestCoverLetterGeneration"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll cover letter checks passed.");
}

main();
