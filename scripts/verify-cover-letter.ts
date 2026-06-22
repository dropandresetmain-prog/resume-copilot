import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCoverLetter } from "../src/lib/ai/cover-letter-mock";
import { buildCompanyContext, resolveCompanyNameForGeneration } from "../src/lib/company-context/build-company-context";
import { parseCoverLetterJson } from "../src/lib/cover-letter/parse";
import {
  buildCoverLetterPrompt,
  promptIncludesCoverLetterRules,
} from "../src/lib/cover-letter/prompt";
import { validateCoverLetterGenerationResult } from "../src/lib/cover-letter/generation-validation";
import { buildResumeEvidenceSpine } from "../src/lib/cover-letter/resume-evidence";
import { renderCoverLetterPdfHtml } from "../src/lib/cover-letter/pdf-html";
import { RESUME_DRAFT_SCHEMA_VERSION } from "../src/types/resume-draft";
import type { GeneratedResumeDraftRecord } from "../src/types/resume-draft";

function buildSampleResumeDraft(): GeneratedResumeDraftRecord {
  return {
    id: "resume-draft-1",
    userId: "user-1",
    jobDescriptionId: "jd-1",
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: "Product Manager",
      header: { includeHeader: true, fullName: "Min Htet" },
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
    communicationProfile: "Refer to Min Htet. Strategy & Operations background.",
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

  const checks: [string, boolean][] = [
    ["company context builder sets confidence", companyContext.confidence === "high"],
    ["resolve company name prefers override", resolveCompanyNameForGeneration({ override: "Beta Co", jobDescriptionText: "at Alpha" }) === "Beta Co"],
    ["resume evidence spine includes bullet", input.resumeEvidenceSpine.includes("workflow automation")],
    ["prompt includes cover letter rules", promptIncludesCoverLetterRules(prompt)],
    ["prompt references Min Htet naming rule", prompt.includes('never "Min"')],
    ["mock formal content present", mock.formalContent.includes("Min Htet")],
    ["mock secondary email present", mock.rationale.emailCoverLetter.length > 0],
    ["validation accepts mock formal letter", validation.ok],
    ["parser accepts formal cover letter json", parsed.ok === true],
    ["pdf html renders paragraphs", renderCoverLetterPdfHtml("Dear Hiring Manager,\n\nBody.").includes("<p>")],
    ["profile page saves communication profile", profilePage.includes("saveApplicationCommunicationProfileToCloud")],
    ["generate supports combined mode", generateSection.includes("resume_and_cover_letter")],
    ["generate wires cover letter save", generateSection.includes("generateAndSaveCoverLetterDraft")],
    ["cover preview supports docx/pdf export", coverPreview.includes("DownloadCoverLetterPdfButton") && coverPreview.includes("DownloadCoverLetterDocxButton")],
    ["schema mentions communication profiles", schema.includes("application_communication_profiles") || readFileSync(join(process.cwd(), "supabase/migrations/20260622_application_communication_v090.sql"), "utf8").includes("application_communication_profiles")],
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
