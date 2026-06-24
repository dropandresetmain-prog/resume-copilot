import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFallbackCompanyContext } from "../../src/lib/company-context/build-company-context";
import {
  COMPANY_RESEARCH_AUTO_FAIL_WARNING,
  ensureCompanyContextForGeneration,
} from "../../src/lib/company-context/ensure-for-generation";
import { hasUsableCompanyContext, savedWebsiteContextMatchesTarget } from "../../src/lib/company-context/normalize";
import { planCompanyResearchForGeneration } from "../../src/lib/company-context/research-plan";
import { resolveGenerateContextPolicy } from "../../src/lib/generate/context-policy";
import {
  formatCompanyResearchStatusLabel,
  resolveCompanyResearchDisplayStatus,
} from "../../src/lib/company-context/status-labels";
import { createJobDescriptionFromInput } from "../../src/lib/jd/persistence";
import type { CompanyContext } from "../../src/types/company-context";

function buildWebsiteResearch(): CompanyContext {
  return {
    companyName: "Pave Bank",
    displayName: "Pave Bank",
    sourceType: "website_research",
    sources: [{ type: "firecrawl", url: "https://pavebank.com", success: true }],
    companySummary: "Digital bank from website research.",
    productsAndServices: [],
    likelyHiringPriorities: [],
    suggestedNarrativeAngles: [],
    confidence: "medium",
    limitations: [],
    generatedAt: "2025-01-01T00:00:00.000Z",
  };
}

async function main() {
  const job = createJobDescriptionFromInput({
    rawText: "Product Manager at Pave Bank.",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const saved = buildWebsiteResearch();
  const jdOnly = buildFallbackCompanyContext({
    companyName: "Pave Bank",
    jobDescriptionText: job.rawText,
  });

  const reused = await ensureCompanyContextForGeneration({
    applicationId: "app-1",
    savedContext: saved,
    job,
    autoGenerate: true,
    companyWebsite: "https://pavebank.com",
  });

  const staleSaved = await ensureCompanyContextForGeneration({
    applicationId: "app-1b",
    savedContext: saved,
    job,
    autoGenerate: false,
    companyWebsite: "https://otherbank.com",
    allowSavedWebsiteContext: true,
    runWebsiteResearch: false,
  });

  const jdOnlyBlocked = await ensureCompanyContextForGeneration({
    applicationId: "app-2",
    savedContext: saved,
    job,
    autoGenerate: true,
    companyWebsite: "https://pavebank.com",
    allowSavedWebsiteContext: false,
    runWebsiteResearch: false,
  });
  void jdOnlyBlocked;

  const websitePolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    companyWebsiteInput: "https://pavebank.com",
    outputMode: "resume_and_cover_letter",
    jobDescriptionText: job.rawText,
  });
  const confidentialPolicy = resolveGenerateContextPolicy({
    confidentialPosting: true,
    companyWebsiteInput: "https://pavebank.com",
    outputMode: "resume_and_cover_letter",
    jobDescriptionText: job.rawText,
  });

  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const research = readFileSync(join(process.cwd(), "src/lib/company-context/research.ts"), "utf8");

  const editorPanel = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyContextEditorPanel.tsx"),
    "utf8",
  );
  const compactStatus = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyResearchCompactStatus.tsx"),
    "utf8",
  );

  const ensureTs = readFileSync(
    join(process.cwd(), "src/lib/company-context/ensure-for-generation.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["saved website research reused when domain matches", reused.status === "saved" && reused.companyContext === saved],
    [
      "saved website not reused when domain differs",
      staleSaved.status !== "saved" || staleSaved.companyContext !== saved,
    ],
    [
      "saved context match helper",
      savedWebsiteContextMatchesTarget(saved, "https://www.pavebank.com") &&
        !savedWebsiteContextMatchesTarget(saved, "https://otherbank.com"),
    ],
    [
      "jd only policy does not reuse saved website context",
      planCompanyResearchForGeneration({
        savedContext: saved,
        policy: confidentialPolicy,
      }) !== "use_saved_website" &&
        ensureTs.includes("savedWebsiteContextMatchesTarget"),
    ],
    [
      "jd only saved plans build jd not saved website",
      planCompanyResearchForGeneration({
        savedContext: jdOnly,
        policy: resolveGenerateContextPolicy({
          confidentialPosting: false,
          companyWebsiteInput: "https://pavebank.com",
          outputMode: "resume_and_cover_letter",
        }),
      }) === "run_firecrawl",
    ],
    ["failure warning mentions JD-based", COMPANY_RESEARCH_AUTO_FAIL_WARNING.includes("JD-based")],
    [
      "will auto-research when website provided",
      resolveCompanyResearchDisplayStatus({
        savedContext: null,
        policy: websitePolicy,
      }) === "will_auto_research",
    ],
    [
      "will jd-only without website",
      resolveCompanyResearchDisplayStatus({
        savedContext: null,
        policy: resolveGenerateContextPolicy({
          confidentialPosting: false,
          outputMode: "resume_and_cover_letter",
        }),
      }) === "will_jd_only",
    ],
    [
      "confidential display status",
      resolveCompanyResearchDisplayStatus({
        savedContext: null,
        policy: confidentialPolicy,
      }) === "confidential_jd_only",
    ],
    [
      "website saved label",
      formatCompanyResearchStatusLabel("website_saved").includes(
        "Company research: website-backed research saved",
      ),
    ],
    [
      "auto research label",
      formatCompanyResearchStatusLabel("will_auto_research").includes("will run automatically"),
    ],
    [
      "compact status component exists",
      compactStatus.includes("CompanyResearchCompactStatus"),
    ],
    [
      "manual research collapsed in editor",
      editorPanel.includes("<details"),
    ],
    ["generate section calls ensureCompanyContextForGeneration", generateSection.includes("ensureCompanyContextForGeneration")],
    [
      "retry cover letter does not auto-research",
      !generateSection.split("async function handleRetryCoverLetter")[1]?.includes(
        "ensureCompanyContextForGeneration",
      ),
    ],
    ["research only scrapes with explicit website", research.includes("resolveCompanyWebsiteForResearch")],
    ["saved research is usable", hasUsableCompanyContext(saved)],
    ["no company name override in generate section", !generateSection.includes("companyNameOverride")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll auto company research checks passed.");
}

void main();
