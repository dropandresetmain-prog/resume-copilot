import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCoverLetter } from "../../src/lib/ai/cover-letter-mock";
import { COVER_LETTER_RESPONSE_SCHEMA } from "../../src/lib/ai/cover-letter-gemini";
import { reviseMockCoverLetter } from "../../src/lib/ai/revise-cover-letter-mock";
import { buildCompanyContext, resolveCompanyNameForGeneration } from "../../src/lib/company-context/build-company-context";
import { detectBannedPhrases, hasBannedPhrases } from "../../src/lib/cover-letter/banned-phrases";
import { normalizeCompanyDisplayName } from "../../src/lib/cover-letter/company-name";
import { buildCoverLetterEvidencePrompt } from "../../src/lib/cover-letter/evidence-prompt";
import { normalizeCoverLetterEvidenceControls } from "../../src/lib/cover-letter/evidence-controls";
import { parseCoverLetterJson } from "../../src/lib/cover-letter/parse";
import {
  assertExportableCoverLetterBody,
  validateFormalCoverLetterBody,
  validateCoverLetterGenerationResult,
} from "../../src/lib/cover-letter/generation-validation";
import {
  buildCoverLetterPrompt,
  promptExcludesCandidateNamePlaceholder,
  promptIncludesBannedPhraseRules,
  promptIncludesCoverLetterRules,
  promptIncludesHiringArgumentRules,
  promptIncludesPunctuationRules,
  promptIncludesStorySpineRules,
  promptIncludesToneRules,
} from "../../src/lib/cover-letter/prompt";
import { buildCoverLetterRevisionPrompt } from "../../src/lib/cover-letter/revision-prompt";
import {
  containsCandidateNamePlaceholder,
  extractClosingSignatureFromBody,
} from "../../src/lib/cover-letter/signature";
import {
  coverLetterRevisionShouldPersist,
  validateCoverLetterRevisionRequest,
} from "../../src/lib/cover-letter/revision-client";
import { buildResumeEvidenceSpine, countWords } from "../../src/lib/cover-letter/resume-evidence";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  isOverWordLimit,
} from "../../src/lib/cover-letter/word-limits";
import { renderCoverLetterPdfHtml } from "../../src/lib/cover-letter/pdf-html";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { buildEvidenceSpine } from "../../src/lib/evidence/spine";
import { buildCoverLetterStorySpine } from "../../src/lib/evidence/story-spine";
import { buildPackageTailoringDiagnostics } from "../../src/lib/package/tailoring-diagnostics";
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
  const flatProviderShape = parseCoverLetterJson(
    JSON.stringify({
      formalContent: mock.formalContent,
      rationale: mock.rationale,
    }),
  );
  const formalCoverLetterSchema =
    COVER_LETTER_RESPONSE_SCHEMA.properties.formalCoverLetter;

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
  const storyTailoringInventory = {
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
  } satisfies InventoryState;
  const storyTailoringDiagnostics = buildPackageTailoringDiagnostics({
    resumeDraft: {
      ...storyResumeDraft,
      inputSnapshot: {
        schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
        jobDescriptionId: storyJob.id,
        referenceResumeId: "resume-1",
        referenceResumeFilename: "resume.docx",
        approvedKeywordIds: [],
        approvedKeywords: [],
        collatedSummary: {
          experienceCount: 1,
          bulletCount: 1,
          educationCount: 0,
          skillCount: 0,
        },
        evidenceSpine: storySpineEvidence.snapshot,
      },
    },
    coverLetter: {
      id: "cl-story",
      userId: "user-1",
      jobDescriptionId: storyJob.id,
      resumeDraftId: storyResumeDraft.id,
      body: "Dear hiring team, I am applying for the Product Lead role.",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    jobDescription: storyJob,
    inventory: storyTailoringInventory,
    companyContext: storyCompanyContext,
  });
  const proofControlCollated: CollatedInventory = {
    ...storyCollated,
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
    skillItems: [
      {
        id: "skill-1",
        category: "Technical Skills",
        text: "Blockchain platform operations",
        sourceCitations: [],
      },
    ],
  };
  const proofControlSpine = buildEvidenceSpine({
    collated: proofControlCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
    maxWorkBullets: 5,
    companyContext: storyCompanyContext,
  });
  const lowWorkEvidenceId = `work_bullet:${hiddenBulletKey}`;
  const additionalEvidenceId = "additional:add-line-1";
  const educationEvidenceId = "education:edu-1";
  const forcedProofSpine = buildCoverLetterStorySpine({
    spine: proofControlSpine,
    companyContext: storyCompanyContext,
    resumeDraft: storyResumeDraft,
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
    evidenceControls: normalizeCoverLetterEvidenceControls({
      forcedEvidenceIds: [lowWorkEvidenceId, additionalEvidenceId, educationEvidenceId],
      excludedEvidenceIds: [],
    }),
  });
  const excludedProofSpine = buildCoverLetterStorySpine({
    spine: proofControlSpine,
    companyContext: storyCompanyContext,
    resumeDraft: storyResumeDraft,
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
    evidenceControls: {
      forcedEvidenceIds: [],
      excludedEvidenceIds: [additionalEvidenceId],
    },
  });
  const skillKeywordBaselineSpine = buildCoverLetterStorySpine({
    spine: proofControlSpine,
    companyContext: storyCompanyContext,
    resumeDraft: storyResumeDraft,
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
  });
  const skillKeywordForcedSpine = buildCoverLetterStorySpine({
    spine: proofControlSpine,
    companyContext: storyCompanyContext,
    resumeDraft: storyResumeDraft,
    jdText: storyJob.rawText,
    roleTitle: storyJob.roleTitle,
    evidenceControls: {
      forcedEvidenceIds: ["skill:skill-1", "keyword_tied:fake:Blockchain"],
      excludedEvidenceIds: [],
    },
  });
  const storyInventory = {
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
        education: [
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
  } satisfies InventoryState;
  const evidencePromptBaseline = buildCoverLetterEvidencePrompt({
    inventory: storyInventory,
    resumeDraft: storyResumeDraft,
    job: storyJob,
    companyContext: storyCompanyContext,
    companyDisplayName: "FinCo",
  });
  const evidencePromptExcludedAdditional = buildCoverLetterEvidencePrompt({
    inventory: storyInventory,
    resumeDraft: storyResumeDraft,
    job: storyJob,
    companyContext: storyCompanyContext,
    companyDisplayName: "FinCo",
    evidenceControls: {
      forcedEvidenceIds: [],
      excludedEvidenceIds: ["additional:add-overlay-1"],
    },
  });
  const baselineProofIds =
    evidencePromptBaseline.storySpine?.proofStories.map((story) => story.evidenceId) ?? [];
  const excludedAdditionalProofIds =
    evidencePromptExcludedAdditional.storySpine?.proofStories.map((story) => story.evidenceId) ?? [];
  const evidencePromptSource = readFileSync(
    join(process.cwd(), "src/lib/cover-letter/evidence-prompt.ts"),
    "utf8",
  );
  const coverLetterEvidencePanel = readFileSync(
    join(process.cwd(), "src/components/cover-letters/CoverLetterEvidenceRegenerationPanel.tsx"),
    "utf8",
  );
  const coverLetterGenerationSource = readFileSync(
    join(process.cwd(), "src/lib/generate/cover-letter-generation.ts"),
    "utf8",
  );
  const revisionPanel = readFileSync(
    join(process.cwd(), "src/components/cover-letters/CoverLetterStagedRevisionPanel.tsx"),
    "utf8",
  );
  const revisionClient = readFileSync(
    join(process.cwd(), "src/lib/cover-letter/revision-client.ts"),
    "utf8",
  );
  const revisionRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/revise-cover-letter/route.ts"),
    "utf8",
  );
  const resumePreview = readFileSync(
    join(process.cwd(), "src/components/pages/ResumePreviewPageClient.tsx"),
    "utf8",
  );
  const pdfRoute = readFileSync(
    join(process.cwd(), "src/app/api/export/cover-letter-pdf/route.ts"),
    "utf8",
  );

  const qualityInput = {
    jobDescription: {
      id: "jd-quality",
      rawText: "Operations Manager at FAR EAST FACADE (SINGAPORE)",
      companyName: "FAR EAST FACADE (SINGAPORE)",
      roleTitle: "Operations Manager",
    },
    resumeDraftId: "resume-quality",
    resumeEvidenceSpine: "- Led workflow automation and payment operations.",
    communicationProfile: "Internal profile may mention founder-operator — do not copy.",
    companyName: "Far East Facade",
    companyDisplayName: "Far East Facade",
    companyNameRaw: "FAR EAST FACADE (SINGAPORE)",
    country: "Singapore",
    companyContext: buildCompanyContext({
      companyName: "Far East Facade",
      country: "Singapore",
      jobDescriptionText: "Operations Manager at Far East Facade",
    }),
  };
  const qualityMock = generateMockCoverLetter(qualityInput);
  const qualityPrompt = buildCoverLetterPrompt(qualityInput);
  const qualityPromptWithoutCandidate = buildCoverLetterPrompt({
    ...qualityInput,
    candidateName: undefined,
  });
  const revisionPrompt = buildCoverLetterRevisionPrompt({
    currentBody: qualityMock.formalContent,
    action: "shorten",
    companyDisplayName: "Far East Facade",
  });
  const revisionPromptWithCandidate = buildCoverLetterRevisionPrompt({
    currentBody: `${qualityMock.formalContent}\n\nRegards,\nAlex Tan`,
    action: "shorten",
    companyDisplayName: "Far East Facade",
    candidateName: "Alex Tan",
  });
  const revisionPromptWithoutCandidate = buildCoverLetterRevisionPrompt({
    currentBody: `${qualityMock.formalContent}\n\nRegards,\nAlex Tan`,
    action: "shorten",
    companyDisplayName: "Far East Facade",
  });
  const placeholderBodyValidation = validateFormalCoverLetterBody(
    `${qualityMock.formalContent}\n\nRegards,\n[Candidate Name]`,
  );
  const overLimitBody = `${qualityMock.formalContent}\n\n${Array.from({ length: 300 }, () => "additional").join(" ")}`;
  const overLimitValidation = validateFormalCoverLetterBody(overLimitBody);
  const qualityMockValidation = validateFormalCoverLetterBody(qualityMock.formalContent, {
    rationale: qualityMock.rationale,
    companyDisplayName: "Far East Facade",
  });
  const shortened = reviseMockCoverLetter({
    currentBody: overLimitBody,
    action: "shorten",
  });
  const qualityResumeDraft: GeneratedResumeDraftRecord = {
    id: "resume-quality",
    userId: "user-1",
    jobDescriptionId: "jd-quality",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: "Operations Manager",
      header: { includeHeader: true, fullName: "Alex Tan" },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      experience: [],
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
  const storySpineQualityPrompt = buildCoverLetterPrompt({
    ...qualityInput,
    resumeEvidenceSpine: buildCoverLetterEvidencePrompt({
      inventory: {
        resumes: [
          {
            id: "resume-1",
            filename: "resume.docx",
            uploadedAt: "2025-01-01T00:00:00.000Z",
            workExperiences: [],
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
              id: "add-1",
              text: "Led workflow automation and payment operations for regional teams.",
              category: "Projects",
              addedAt: "2025-01-01T00:00:00.000Z",
            },
          ],
        },
      },
      resumeDraft: qualityResumeDraft,
      job: qualityInput.jobDescription,
      companyContext: qualityInput.companyContext,
      companyDisplayName: qualityInput.companyDisplayName,
    }).resumeEvidenceSpine,
  });

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
    [
      "provider schema requires formalCoverLetter.content",
      COVER_LETTER_RESPONSE_SCHEMA.required.includes("formalCoverLetter") &&
        formalCoverLetterSchema.required.includes("content"),
    ],
    [
      "parser still rejects uncontracted flat provider shape",
      flatProviderShape.ok === false &&
        flatProviderShape.error === "Missing formalCoverLetter.content.",
    ],
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
      "tailoring diagnostics surfaces off-resume cover letter proof",
      storyTailoringDiagnostics.coverLetterProof.some((line) =>
        line.message.includes("not on resume draft"),
      ) &&
        storyTailoringDiagnostics.suggestedActions.some(
          (action) => action.id === "edit-cover-letter-evidence",
        ),
    ],
    [
      "story spine includes avoid overclaim for company context",
      storySpine.avoidOverclaim.some((note) => note.toLowerCase().includes("framing only")),
    ],
    [
      "excluded inventory evidence omitted from story spine proof",
      !hiddenStorySpine.proofStories.some((story) => story.groundedText.includes("internal reporting packs")),
    ],
    [
      "forced work additional education appear in cover letter proof stories",
      forcedProofSpine.proofStories.some((story) => story.evidenceId === lowWorkEvidenceId) &&
        forcedProofSpine.proofStories.some((story) => story.evidenceId === additionalEvidenceId) &&
        forcedProofSpine.proofStories.some((story) => story.evidenceId === educationEvidenceId),
    ],
    [
      "excluded cover letter evidence omitted from proof stories",
      !excludedProofSpine.proofStories.some((story) => story.evidenceId === additionalEvidenceId),
    ],
    [
      "skill and keyword forced ids do not become cover letter proof stories",
      (() => {
        const baselineIds = new Set(
          skillKeywordBaselineSpine.proofStories.map((story) => story.evidenceId),
        );
        const invalidForced = ["skill:skill-1", "keyword_tied:fake:Blockchain"];
        return !invalidForced.some(
          (id) =>
            skillKeywordForcedSpine.proofStories.some((story) => story.evidenceId === id) &&
            !baselineIds.has(id),
        );
      })(),
    ],
    [
      "cover letter evidence prompt passes pending controls to story spine",
      evidencePromptSource.includes("evidenceControls: options.evidenceControls") &&
        baselineProofIds.includes("additional:add-overlay-1") &&
        !excludedAdditionalProofIds.includes("additional:add-overlay-1"),
    ],
    [
      "cover letter generation threads evidence controls into evidence prompt",
      coverLetterGenerationSource.includes("evidenceControls: options.evidenceControls"),
    ],
    [
      "cover letter preview passes pending evidence controls on regenerate",
      coverPreview.includes("evidenceControls") &&
        coverPreview.includes("setPendingEvidenceControls({ forcedEvidenceIds: [], excludedEvidenceIds: [] })"),
    ],
    [
      "cover letter evidence panel stages without ai",
      coverLetterEvidencePanel.includes("Staging does not save and does not call AI") &&
        coverLetterEvidencePanel.includes("data-action=\"stage-cover-letter-force-evidence\""),
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
    ["word count utility counts words", countWords("one two three") === 3],
    ["hard max constant is 420", FORMAL_COVER_LETTER_MAX_WORDS === 420],
    ["over limit detection works", isOverWordLimit(421)],
    ["over limit body fails validation", !overLimitValidation.ok],
    ["quality mock letter passes validation", qualityMockValidation.ok],
    ["quality mock letter under 420 words", countWords(qualityMock.formalContent) <= 420],
    ["quality mock letter avoids banned phrases", !hasBannedPhrases(qualityMock.formalContent)],
    [
      "company name strips legal suffix",
      normalizeCompanyDisplayName("FAR EAST FACADE (SINGAPORE)") === "Far East Facade",
    ],
    [
      "company name strips pte ltd",
      normalizeCompanyDisplayName("PAVE BANK PTE LTD") === "Pave Bank",
    ],
    [
      "company name strips private limited",
      normalizeCompanyDisplayName("ABC TECHNOLOGIES PRIVATE LIMITED") === "ABC Technologies",
    ],
    ["banned phrase detection finds founder-operator", detectBannedPhrases("founder-operator").length > 0],
    ["prompt includes tone rules", promptIncludesToneRules(qualityPrompt)],
    ["prompt includes hiring argument rules", promptIncludesHiringArgumentRules(qualityPrompt)],
    [
      "prompt includes story spine rules when inventory spine present",
      promptIncludesStorySpineRules(storySpineQualityPrompt),
    ],
    ["prompt includes banned phrase rules", promptIncludesBannedPhraseRules(qualityPrompt)],
    [
      "generation prompt excludes candidate name placeholder",
      promptExcludesCandidateNamePlaceholder(qualityPrompt) &&
        promptExcludesCandidateNamePlaceholder(qualityPromptWithoutCandidate),
    ],
    [
      "generation prompt neutral closing without candidate name",
      qualityPromptWithoutCandidate.includes("Regards,") &&
        !qualityPromptWithoutCandidate.includes("[Candidate Name]"),
    ],
    ["revision prompt avoids em dashes", revisionPrompt.includes("em dash")],
    [
      "revision prompt uses candidate name when provided",
      revisionPromptWithCandidate.includes('closing signature ("Alex Tan")') &&
        !revisionPromptWithCandidate.includes('closing signature ("[Candidate Name]")'),
    ],
    [
      "revision prompt preserves existing signature without candidate name",
      revisionPromptWithoutCandidate.includes('existing closing signature ("Alex Tan")') &&
        !revisionPromptWithoutCandidate.includes('closing signature ("[Candidate Name]")'),
    ],
    [
      "revision route uses saved story spine prompt when available",
      revisionRoute.includes("storySpinePrompt"),
    ],
    [
      "revision route passes candidateName from resume draft",
      revisionRoute.includes("candidateName = resumeDraft?.content.header.fullName") &&
        revisionRoute.includes("candidateName,"),
    ],
    [
      "placeholder signature fails validation",
      !placeholderBodyValidation.ok &&
        placeholderBodyValidation.errors.some((entry) => entry.code === "candidate_name_placeholder"),
    ],
    [
      "placeholder detection is case insensitive",
      containsCandidateNamePlaceholder("[candidate name]") &&
        containsCandidateNamePlaceholder("[Candidate name]"),
    ],
    [
      "extract closing signature from body",
      extractClosingSignatureFromBody("Hello\n\nRegards,\nAlex Tan") === "Alex Tan",
    ],
    ["quality prompt includes 420 max", qualityPrompt.includes("420")],
    ["revision prompt includes current body", revisionPrompt.includes(qualityMock.formalContent)],
    [
      "revision request validation requires draft id",
      validateCoverLetterRevisionRequest({
        draftId: "",
        currentBody: "hello",
        action: "shorten",
      }) !== null,
    ],
    [
      "custom revision validation requires instruction",
      validateCoverLetterRevisionRequest({
        draftId: "cl-1",
        currentBody: "hello",
        action: "custom",
      }) === "customInstruction is required for custom revisions.",
    ],
    [
      "custom revision validation accepts instruction",
      validateCoverLetterRevisionRequest({
        draftId: "cl-1",
        currentBody: "hello",
        action: "custom",
        customInstruction: "Make this warmer.",
      }) === null,
    ],
    [
      "revision client sends bearer token",
      revisionClient.includes("Authorization: `Bearer ${accessToken}`") &&
        revisionClient.includes("getRevisionAccessToken"),
    ],
    [
      "revision client maps missing session to sign-in error",
      revisionClient.includes("Sign in required to revise cover letters."),
    ],
    [
      "revision route requires access token",
      revisionRoute.includes("getAccessTokenFromRequest"),
    ],
    [
      "revision route loads draft for authenticated user",
      revisionRoute.includes("getGeneratedCoverLetterDraftForUser"),
    ],
    [
      "revision route updates draft when persist true",
      revisionRoute.includes("coverLetterRevisionShouldPersist") &&
        revisionRoute.includes("updateGeneratedCoverLetterDraftInCloudForUser"),
    ],
    [
      "revision route skips save when persist false",
      revisionRoute.includes("shouldPersist") && revisionRoute.includes("persisted: shouldPersist"),
    ],
    [
      "revision persist helper defaults true",
      coverLetterRevisionShouldPersist({}) === true &&
        coverLetterRevisionShouldPersist({ persist: false }) === false,
    ],
    ["revision route does not load resume generation", !revisionRoute.includes("requestResumeDraftGeneration")],
    ["revision route does not create resume draft", !revisionRoute.includes("createGeneratedResumeDraftInCloud")],
    ["preview page has staged revision panel", coverPreview.includes("CoverLetterStagedRevisionPanel")],
    ["preview page disables export when over limit", coverPreview.includes("exportBlocked")],
    ["staged revision panel has shorten chip", revisionPanel.includes('"shorten"')],
    ["staged revision has revise button", revisionPanel.includes("Revise cover letter")],
    ["staged revision requests candidate only", revisionPanel.includes("persist: false")],
    ["staged revision accept persists via callback", revisionPanel.includes("await onAccepted")],
    [
      "staged revision panel shows regenerate cover letter",
      revisionPanel.includes("Regenerate cover letter") &&
        revisionPanel.includes("data-action=\"regenerate-cover-letter\""),
    ],
    [
      "staged revision chips still stage only until revise",
      revisionPanel.includes("Chips stage instructions only") &&
        revisionPanel.includes("toggleChip") &&
        revisionPanel.includes("persist: false"),
    ],
    [
      "cover letter preview wires regenerate handler",
      coverPreview.includes("onRegenerate={() => void handleRegenerateCoverLetter()}") &&
        coverPreview.includes("existingCoverLetterId: draft.id"),
    ],
    [
      "preview page staged copy",
      coverPreview.includes("Accept saves it") && !coverPreview.includes("save immediately"),
    ],
    [
      "package cover letter state updates on accept only",
      resumePreview.includes("onAccepted={async") &&
        resumePreview.includes("setCoverLetter(updated)") &&
        !resumePreview.includes("onRevised"),
    ],
    [
      "chips toggle only revise calls revision client",
      revisionPanel.includes("toggleChip") &&
        revisionPanel.includes("requestCoverLetterRevision") &&
        !revisionPanel.includes("onClick={() => void runRevision"),
    ],
    ["pdf export validates word count", pdfRoute.includes("assertExportableCoverLetterBody")],
    ["shorten revision respects max", countWords(shortened.body) <= 420],
    ["cover letter unsaved hint", coverPreview.includes("hasUnsavedBodyChanges")],
    [
      "cover letter no mojibake in save button",
      !coverPreview.includes("Savingâ€¦") && coverPreview.includes("Saving\u2026"),
    ],
    [
      "cover letter save disabled when no unsaved changes",
      coverPreview.includes("!hasUnsavedBodyChanges"),
    ],
    [
      "cover letter staged revision saves on accept",
      coverPreview.includes("Staged AI revision saves on Accept only"),
    ],
  ];

  try {
    assertExportableCoverLetterBody(qualityMock.formalContent);
    checks.push(["exportable assertion accepts valid mock", true]);
  } catch {
    checks.push(["exportable assertion accepts valid mock", false]);
  }

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll cover letter checks passed.");
}

main();
