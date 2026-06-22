import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCompanyContext } from "../src/lib/ai/company-context-mock";
import { buildFallbackCompanyContext } from "../src/lib/company-context/build-company-context";
import { GEMINI_END_TO_END_CALL_MAP } from "../src/lib/company-context/gemini-call-map";
import { hasUsableCompanyContext, formatCompanyContextForPrompt } from "../src/lib/company-context/normalize";
import {
  parseCompanyContextJson,
  validateCompanyContextForSave,
} from "../src/lib/company-context/parse";
import {
  buildCompanyContextPrompt,
  promptIncludesCompanyContextRules,
} from "../src/lib/company-context/prompt";
import { resolveCompanyContextForGeneration } from "../src/lib/company-context/resolve-for-generation";
import { normalizeCompanyDisplayName } from "../src/lib/cover-letter/company-name";
import {
  buildCoverLetterPrompt,
  promptIncludesCoverLetterCompanyContextRules,
} from "../src/lib/cover-letter/prompt";
import { buildResumeDraftPrompt } from "../src/lib/resume-draft/prompt";
import { createJobDescriptionFromInput } from "../src/lib/jd/persistence";
import type { CompanyContext } from "../src/types/company-context";

function buildSavedContext(): CompanyContext {
  return {
    companyName: "Pave Bank",
    displayName: "Pave Bank",
    country: "Singapore",
    website: "https://pavebank.com",
    companySummary: "Digital bank focused on business banking and payment operations.",
    productsAndServices: ["Business accounts", "Payment rails"],
    likelyHiringPriorities: ["Payment operations", "Stakeholder management"],
    suggestedNarrativeAngles: [
      {
        angle: "Payment Operations",
        relevance: "JD emphasizes treasury and payment workflows.",
        supportingStories: ["Workflow automation at prior role"],
        avoidOveremphasizing: ["Generic fintech hype"],
      },
    ],
    confidence: "medium",
    limitations: ["Generated from JD and company fields only."],
    generatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function main() {
  const job = createJobDescriptionFromInput({
    rawText: "Product Manager at Pave Bank. Own payment operations and stakeholder workflows.",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const prompt = buildCompanyContextPrompt({
    jobDescriptionText: job.rawText,
    companyName: "Pave Bank",
    country: "Singapore",
    website: "https://pavebank.com",
    roleTitle: "Product Manager",
  });

  const mockJson = generateMockCompanyContext({
    jobDescriptionText: job.rawText,
    companyName: "Pave Bank",
    country: "Singapore",
  });
  const parsed = parseCompanyContextJson(JSON.stringify(mockJson), {
    companyName: "Pave Bank",
  });

  const fallback = buildFallbackCompanyContext({
    companyName: "Pave Bank",
    country: "Singapore",
    jobDescriptionText: job.rawText,
  });

  const saved = buildSavedContext();
  const resolvedWithSaved = resolveCompanyContextForGeneration({
    savedContext: saved,
    input: {
      companyName: "Pave Bank",
      country: "Singapore",
      jobDescriptionText: job.rawText,
    },
  });
  const resolvedWithoutSaved = resolveCompanyContextForGeneration({
    savedContext: null,
    input: {
      companyName: "Pave Bank",
      country: "Singapore",
      jobDescriptionText: job.rawText,
    },
  });

  const resumePrompt = buildResumeDraftPrompt({
    jobDescription: {
      id: job.id,
      rawText: job.rawText,
      companyName: job.companyName,
      roleTitle: job.roleTitle,
    },
    approvedKeywords: [],
    experiences: [],
    education: [],
    additionalExperience: [],
    skills: [],
    referenceResume: {
      resumeId: "resume-1",
      filename: "base.docx",
      formattingOnly: true,
      bulletStyle: "plain",
      sectionOrder: ["summary", "experience"],
      densityHint: "standard",
    },
    companyContext: saved,
  });

  const coverPrompt = buildCoverLetterPrompt({
    jobDescription: job,
    resumeDraftId: "draft-1",
    resumeEvidenceSpine: "- Led payment operations.",
    communicationProfile: "Refer to Min Htet.",
    companyName: "Pave Bank",
    companyDisplayName: "Pave Bank",
    country: "Singapore",
    companyContext: saved,
  });

  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const schema = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260623_application_company_context_v093.sql"),
    "utf8",
  );
  const applicationRecords = readFileSync(
    join(process.cwd(), "src/lib/supabase/application-records.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["company context prompt includes no-web-search rule", promptIncludesCompanyContextRules(prompt)],
    ["company context prompt includes narrative angles", prompt.includes("suggestedNarrativeAngles")],
    ["mock company context parses", parsed.companySummary.length > 0],
    ["parser validates save requires summary", validateCompanyContextForSave(parsed) === null],
    ["display name normalization trims legal suffix", normalizeCompanyDisplayName("ACME PTE. LTD.") === "Acme"],
    ["fallback context is usable", hasUsableCompanyContext(fallback)],
    ["saved context preferred over fallback", resolvedWithSaved.companySummary === saved.companySummary],
    ["generation works without saved context", hasUsableCompanyContext(resolvedWithoutSaved)],
    ["format for prompt includes summary", formatCompanyContextForPrompt(saved).includes("Digital bank")],
    ["resume prompt includes company context lightly", resumePrompt.includes("Saved company context")],
    ["cover prompt avoids generic admiration", promptIncludesCoverLetterCompanyContextRules(coverPrompt)],
    ["gemini call map includes company context step", GEMINI_END_TO_END_CALL_MAP.some((step) => step.route === "/api/ai/generate-company-context")],
    ["schema has company_context column", schema.includes("company_context jsonb")],
    ["migration adds company_context", migration.includes("company_context")],
    ["application records save company context", applicationRecords.includes("saveApplicationCompanyContextInCloud")],
    ["generate section wires company context editor", generateSection.includes("CompanyContextEditorPanel")],
    ["generate auto-ensures company context", generateSection.includes("ensureCompanyContextForGeneration")],
    ["generate passes company context to resume payload", generateSection.includes("companyContext: companyContextForGeneration")],
    ["generate passes saved context to cover letter", generateSection.includes("savedCompanyContext: context.companyContext")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll company context checks passed.");
}

main();
