import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCoverLetter } from "../../src/lib/ai/cover-letter-mock";
import { reviseMockCoverLetter } from "../../src/lib/ai/revise-cover-letter-mock";
import { detectBannedPhrases, hasBannedPhrases } from "../../src/lib/cover-letter/banned-phrases";
import { normalizeCompanyDisplayName } from "../../src/lib/cover-letter/company-name";
import {
  assertExportableCoverLetterBody,
  validateFormalCoverLetterBody,
} from "../../src/lib/cover-letter/generation-validation";
import {
  buildCoverLetterPrompt,
  promptExcludesCandidateNamePlaceholder,
  promptIncludesBannedPhraseRules,
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
import { countWords } from "../../src/lib/cover-letter/resume-evidence";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  isOverWordLimit,
} from "../../src/lib/cover-letter/word-limits";
import { buildCompanyContext } from "../../src/lib/company-context/build-company-context";
import { buildCoverLetterEvidencePrompt } from "../../src/lib/cover-letter/evidence-prompt";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";
import { RESUME_DRAFT_SCHEMA_VERSION } from "../../src/types/resume-draft";
import type { GeneratedResumeDraftRecord } from "../../src/types/resume-draft";

function buildSampleInput() {
  const companyContext = buildCompanyContext({
    companyName: "Far East Facade",
    country: "Singapore",
    jobDescriptionText: "Operations Manager at Far East Facade",
  });

  return {
    jobDescription: {
      id: "jd-1",
      rawText: "Operations Manager at FAR EAST FACADE (SINGAPORE)",
      companyName: "FAR EAST FACADE (SINGAPORE)",
      roleTitle: "Operations Manager",
    },
    resumeDraftId: "resume-1",
    resumeEvidenceSpine: "- Led workflow automation and payment operations.",
    communicationProfile: "Internal profile may mention founder-operator — do not copy.",
    companyName: "Far East Facade",
    companyDisplayName: "Far East Facade",
    companyNameRaw: "FAR EAST FACADE (SINGAPORE)",
    country: "Singapore",
    companyContext,
  };
}

function main() {
  const input = buildSampleInput();
  const mock = generateMockCoverLetter(input);
  const prompt = buildCoverLetterPrompt(input);
  const promptWithoutCandidate = buildCoverLetterPrompt({
    ...input,
    candidateName: undefined,
  });
  const revisionPrompt = buildCoverLetterRevisionPrompt({
    currentBody: mock.formalContent,
    action: "shorten",
    companyDisplayName: "Far East Facade",
  });
  const revisionPromptWithCandidate = buildCoverLetterRevisionPrompt({
    currentBody: `${mock.formalContent}\n\nRegards,\nAlex Tan`,
    action: "shorten",
    companyDisplayName: "Far East Facade",
    candidateName: "Alex Tan",
  });
  const revisionPromptWithoutCandidate = buildCoverLetterRevisionPrompt({
    currentBody: `${mock.formalContent}\n\nRegards,\nAlex Tan`,
    action: "shorten",
    companyDisplayName: "Far East Facade",
  });
  const placeholderBodyValidation = validateFormalCoverLetterBody(
    `${mock.formalContent}\n\nRegards,\n[Candidate Name]`,
  );
  const previewPage = readFileSync(
    join(process.cwd(), "src/components/pages/CoverLetterPreviewPageClient.tsx"),
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

  const overLimitBody = `${mock.formalContent}\n\n${Array.from({ length: 300 }, () => "additional").join(" ")}`;
  const overLimitValidation = validateFormalCoverLetterBody(overLimitBody);
  const mockValidation = validateFormalCoverLetterBody(mock.formalContent, {
    rationale: mock.rationale,
    companyDisplayName: "Far East Facade",
  });
  const shortened = reviseMockCoverLetter({
    currentBody: overLimitBody,
    action: "shorten",
  });

  const resumeDraft: GeneratedResumeDraftRecord = {
    id: "resume-1",
    userId: "user-1",
    jobDescriptionId: "jd-1",
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

  const storySpinePrompt = buildCoverLetterPrompt({
    ...input,
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
      resumeDraft,
      job: {
        id: input.jobDescription.id,
        rawText: input.jobDescription.rawText,
        companyName: input.jobDescription.companyName,
        roleTitle: input.jobDescription.roleTitle,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      companyContext: input.companyContext,
      companyDisplayName: input.companyDisplayName,
    }).resumeEvidenceSpine,
  });

  const checks: [string, boolean][] = [
    ["word count utility counts words", countWords("one two three") === 3],
    ["hard max constant is 420", FORMAL_COVER_LETTER_MAX_WORDS === 420],
    ["over limit detection works", isOverWordLimit(421)],
    ["over limit body fails validation", !overLimitValidation.ok],
    ["mock letter passes validation", mockValidation.ok],
    ["mock letter under 420 words", countWords(mock.formalContent) <= 420],
    ["mock letter avoids banned phrases", !hasBannedPhrases(mock.formalContent)],
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
    ["prompt includes tone rules", promptIncludesToneRules(prompt)],
    ["prompt includes hiring argument rules", promptIncludesHiringArgumentRules(prompt)],
    ["prompt includes story spine rules when inventory spine present", promptIncludesStorySpineRules(storySpinePrompt)],
    ["prompt includes punctuation rules", promptIncludesPunctuationRules(prompt)],
    ["prompt includes banned phrase rules", promptIncludesBannedPhraseRules(prompt)],
    [
      "generation prompt excludes candidate name placeholder",
      promptExcludesCandidateNamePlaceholder(prompt) &&
        promptExcludesCandidateNamePlaceholder(promptWithoutCandidate),
    ],
    [
      "generation prompt neutral closing without candidate name",
      promptWithoutCandidate.includes("Regards,") &&
        !promptWithoutCandidate.includes("[Candidate Name]"),
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
    ["prompt includes 420 max", prompt.includes("420")],
    ["revision prompt includes current body", revisionPrompt.includes(mock.formalContent)],
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
    ["preview page has staged revision panel", previewPage.includes("CoverLetterStagedRevisionPanel")],
    ["preview page disables export when over limit", previewPage.includes("exportBlocked")],
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
      previewPage.includes("onRegenerate={() => void handleRegenerateCoverLetter()}") &&
        previewPage.includes("existingCoverLetterId: draft.id"),
    ],
    [
      "preview page staged copy",
      previewPage.includes("Accept saves it") && !previewPage.includes("save immediately"),
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
  ];

  try {
    assertExportableCoverLetterBody(mock.formalContent);
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

  console.log("\nAll cover letter quality checks passed.");
}

main();
