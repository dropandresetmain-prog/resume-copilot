import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCoverLetter } from "../../src/lib/ai/cover-letter-mock";
import { buildCompanyContext } from "../../src/lib/company-context/build-company-context";
import {
  extractBrandNameFromWebsite,
  isUrlLikeCompanyName,
  normalizeCompanyDisplayName,
  resolveCompanyDisplayNameForProse,
} from "../../src/lib/cover-letter/company-name";
import {
  prepareGeneratedCoverLetterResult,
  validateFormalCoverLetterBody,
} from "../../src/lib/cover-letter/generation-validation";
import {
  buildCoverLetterExportFileNameInput,
  resolveCoverLetterPdfFileName,
} from "../../src/lib/cover-letter/export-filename";
import {
  buildCoverLetterPrompt,
  promptIncludesCoverLetterCompanyContextRules,
  promptRequiresExplicitBridges,
} from "../../src/lib/cover-letter/prompt";
import { buildResumeEvidenceSpine } from "../../src/lib/cover-letter/resume-evidence";
import {
  rankExperiencesForRole,
  documentStoryRankingMethodology,
} from "../../src/lib/cover-letter/story-ranking";
import { RESUME_DRAFT_SCHEMA_VERSION } from "../../src/types/resume-draft";
import type { GeneratedResumeDraftRecord } from "../../src/types/resume-draft";

function buildSampleInput() {
  const companyContext = buildCompanyContext({
    companyName: "https://shelfperfect.com/",
    country: "Singapore",
    website: "https://shelfperfect.com/",
    jobDescriptionText:
      "B2B Sales Manager at ShelfPerfect. Acquire FMCG customers. Stakeholder management.",
    roleTitle: "B2B Sales Manager",
  });

  return {
    jobDescription: {
      id: "jd-1",
      rawText:
        "B2B Sales Manager at ShelfPerfect. Acquire and grow FMCG customers. Stakeholder management required.",
      companyName: "https://shelfperfect.com/",
      roleTitle: "B2B Sales Manager",
    },
    resumeDraftId: "resume-1",
    resumeEvidenceSpine: "- SBF stakeholder management",
    communicationProfile: "",
    companyName: "ShelfPerfect",
    companyDisplayName: "ShelfPerfect",
    companyNameRaw: "https://shelfperfect.com/",
    country: "Singapore",
    companyWebsite: "https://shelfperfect.com/",
    companyContext,
  };
}

function buildRankedResumeDraft(): GeneratedResumeDraftRecord {
  return {
    id: "resume-1",
    userId: "user-1",
    jobDescriptionId: "jd-1",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: "B2B Sales Manager",
      header: { includeHeader: true, fullName: "Jordan Lee" },
      professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
      experience: [
        {
          role: "Founder",
          company: "Drop & Reset",
          dateRange: "2023 – Present",
          bullets: [{ text: "Built a wellness startup.", sourceRefs: [], confidence: "medium", riskFlags: [] }],
          riskFlags: [],
        },
        {
          role: "Consultant",
          company: "Socius",
          dateRange: "2021 – 2023",
          bullets: [{ text: "Advised SMEs on operations.", sourceRefs: [], confidence: "medium", riskFlags: [] }],
          riskFlags: [],
        },
        {
          role: "Manager, Business Development",
          company: "Singapore Business Federation",
          dateRange: "2019 – 2021",
          bullets: [
            {
              text: "Managed stakeholder relationships and B2B commercial partnerships with FMCG brands.",
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

function main() {
  const input = buildSampleInput();
  const mock = generateMockCoverLetter(input);
  const prepared = prepareGeneratedCoverLetterResult(mock, {
    companyDisplayName: "ShelfPerfect",
  });
  const prompt = buildCoverLetterPrompt(input);
  const resumeDraft = buildRankedResumeDraft();
  const ranked = rankExperiencesForRole(resumeDraft.content.experience, {
    jobDescriptionText: input.jobDescription.rawText,
    roleTitle: input.jobDescription.roleTitle,
    hiringPriorities: input.companyContext.likelyHiringPriorities,
  });
  const spine = buildResumeEvidenceSpine(resumeDraft, {
    jobDescriptionText: input.jobDescription.rawText,
    roleTitle: input.jobDescription.roleTitle,
  });

  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const applicationPackageCoverLetterPanel = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationPackageCoverLetterPanel.tsx"),
    "utf8",
  );
  const coverLetterGeneration = readFileSync(
    join(process.cwd(), "src/lib/generate/cover-letter-generation.ts"),
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

  const urlBody = "I am excited about https://shelfperfect.com/ and the B2B Sales Manager role.";
  const urlValidation = validateFormalCoverLetterBody(urlBody, {
    companyDisplayName: "ShelfPerfect",
  });

  const checks: [string, boolean][] = [
    ["url-like company name detected", isUrlLikeCompanyName("https://shelfperfect.com/")],
    [
      "website hostname becomes display name",
      extractBrandNameFromWebsite("https://shelfperfect.com/") === "Shelfperfect",
    ],
    [
      "resolve display name prefers website brand over raw url",
      resolveCompanyDisplayNameForProse({
        rawName: "https://shelfperfect.com/",
        website: "https://shelfperfect.com/",
      }).companyDisplayName === "Shelfperfect",
    ],
    [
      "normalize strips url to brand",
      normalizeCompanyDisplayName("https://shelfperfect.com/") === "Shelfperfect",
    ],
    ["mock prose avoids urls", !mock.formalContent.includes("https://")],
    ["mock uses display company name", mock.formalContent.includes("ShelfPerfect")],
    ["mock includes company facts in rationale", (mock.rationale.selectedCompanyFacts?.length ?? 0) >= 2],
    ["mock includes role requirements", (mock.rationale.selectedRoleRequirements?.length ?? 0) >= 2],
    ["mock includes bridges", (mock.rationale.companyRoleStoryBridges?.length ?? 0) >= 2],
    ["prepared mock passes validation", prepared.validation.ok],
    ["url in prose fails validation", !urlValidation.ok],
    ["prompt requires company facts", promptIncludesCoverLetterCompanyContextRules(prompt)],
    ["prompt requires explicit bridges", promptRequiresExplicitBridges(prompt)],
    ["prompt bans urls in prose", prompt.includes("NEVER paste URLs")],
    [
      "story ranking puts SBF first for B2B sales JD",
      ranked[0]?.experience.company === "Singapore Business Federation",
    ],
    ["ranked spine includes methodology", spine.includes(documentStoryRankingMethodology().split("\n")[0])],
    [
      "resume preview shows company research",
      resumePreview.includes("CompanyContextPreviewPanel") && resumePreview.includes("defaultOpen={false}"),
    ],
    [
      "combined generation lands on resume preview",
      generateSection.includes("router.push(`/resume-preview/${context.resumeDraft.id}`)"),
    ],
    [
      "cover letter export uses structured filename",
      pdfRoute.includes("resolveCoverLetterPdfFileName"),
    ],
    [
      "export filename format",
      resolveCoverLetterPdfFileName({
        draft: {
          id: "cl-1",
          userId: "u1",
          companyName: "ShelfPerfect",
          body: "",
          createdAt: "",
          updatedAt: "",
        },
        resumeDraft,
        job: { companyName: "ShelfPerfect", roleTitle: "B2B Sales Manager" },
      }) === "Jordan Lee - Cover Letter_ShelfPerfect_B2B Sales Manager.pdf",
    ],
    [
      "export filename input sanitizes url company",
      buildCoverLetterExportFileNameInput({
        draft: {
          id: "cl-1",
          userId: "u1",
          companyName: "https://shelfperfect.com/",
          companyWebsite: "https://shelfperfect.com/",
          body: "",
          createdAt: "",
          updatedAt: "",
        },
        resumeDraft,
        job: { roleTitle: "B2B Sales Manager" },
      }).companyName === "Shelfperfect",
    ],
    [
      "export filename fallback is Candidate not founder name",
      resolveCoverLetterPdfFileName({
        draft: {
          id: "cl-2",
          userId: "u1",
          companyName: "ShelfPerfect",
          body: "",
          createdAt: "",
          updatedAt: "",
        },
        resumeDraft: null,
        job: { companyName: "ShelfPerfect", roleTitle: "B2B Sales Manager" },
      }) === "Candidate - Cover Letter_ShelfPerfect_B2B Sales Manager.pdf",
    ],
    [
      "cover letter prompt does not hardcode founder name",
      !buildCoverLetterPrompt(input).includes("Min Htet"),
    ],
    [
      "application package shows regenerate cover letter when cover letter exists",
      applicationPackageCoverLetterPanel.includes("Regenerate cover letter") &&
        applicationPackageCoverLetterPanel.includes("handleRegenerate"),
    ],
    [
      "regenerate cover letter passes inventory and existing draft id",
      applicationPackageCoverLetterPanel.includes("inventory,") &&
        applicationPackageCoverLetterPanel.includes("existingCoverLetterId"),
    ],
    [
      "regenerate cover letter confirms resume unchanged",
      applicationPackageCoverLetterPanel.includes("resume unchanged") &&
        applicationPackageCoverLetterPanel.includes("window.confirm"),
    ],
    [
      "regenerate cover letter does not call resume generation",
      !applicationPackageCoverLetterPanel.includes("requestResumeDraftGeneration") &&
        !applicationPackageCoverLetterPanel.includes("createGeneratedResumeDraftInCloud"),
    ],
    [
      "cover letter generation replaces existing draft in place",
      coverLetterGeneration.includes("replaceGeneratedCoverLetterDraftInCloud") &&
        coverLetterGeneration.includes("existingCoverLetterId"),
    ],
    [
      "generate page cover letter only remains disabled",
      generateSection.includes('value="cover_letter_only" disabled'),
    ],
    [
      "application package keeps generate cover letter when none exists",
      applicationPackageCoverLetterPanel.includes("Generate cover letter"),
    ],
    [
      "application package keeps edit and export actions",
      applicationPackageCoverLetterPanel.includes("Edit cover letter") &&
        applicationPackageCoverLetterPanel.includes("DownloadCoverLetterPdfButton") &&
        applicationPackageCoverLetterPanel.includes("DownloadCoverLetterDocxButton"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll cover letter application package checks passed.");
}

main();
