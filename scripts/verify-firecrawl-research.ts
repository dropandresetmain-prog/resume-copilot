import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockCompanyContext } from "../src/lib/ai/company-context-mock";
import { buildFallbackCompanyContext } from "../src/lib/company-context/build-company-context";
import {
  buildCompanyContextPrompt,
  promptIncludesWebsiteScrapeContent,
} from "../src/lib/company-context/prompt";
import {
  hasWebsiteBackedResearch,
  normalizeCompanyContext,
} from "../src/lib/company-context/normalize";
import { generateCompanyResearchWithProvider } from "../src/lib/company-context/research";
import {
  FIRECRAWL_MAX_CONTENT_CHARS,
  scrapeCompanyWebsiteWithFirecrawl,
} from "../src/lib/firecrawl/scrape-company-website";
import {
  isJobPostingUrl,
  isValidCompanyWebsiteUrl,
  normalizeCompanyWebsiteUrl,
  resolveCompanyWebsiteForResearch,
} from "../src/lib/firecrawl/url";
import { createJobDescriptionFromInput } from "../src/lib/jd/persistence";

async function main() {
  const job = createJobDescriptionFromInput({
    rawText: "Operations Manager at Acme Corp.",
    companyName: "Acme Corp",
    roleTitle: "Operations Manager",
    jobUrl: "https://boards.greenhouse.io/acme/jobs/12345",
  });

  const companySite = "https://www.acme.com";
  const linkedInJob = "https://www.linkedin.com/jobs/view/12345";

  const promptWithScrape = buildCompanyContextPrompt({
    jobDescriptionText: job.rawText,
    companyName: "Acme Corp",
    country: "Singapore",
    website: companySite,
    websiteScrapeMarkdown: "# Acme Corp\nWe build operational software.",
    websiteScrapeTitle: "Acme Corp — Home",
    researchMode: "website_backed",
  });

  const promptJdOnly = buildCompanyContextPrompt({
    jobDescriptionText: job.rawText,
    companyName: "Acme Corp",
    researchMode: "jd_only",
  });

  const fallback = buildFallbackCompanyContext({
    companyName: "Acme Corp",
    jobDescriptionText: job.rawText,
  });

  const mockResearch = await generateCompanyResearchWithProvider(
    {
      jobDescriptionText: job.rawText,
      companyName: "Acme Corp",
      website: companySite,
    },
    "mock",
  );

  const researchTs = readFileSync(
    join(process.cwd(), "src/lib/company-context/research.ts"),
    "utf8",
  );
  const ensureTs = readFileSync(
    join(process.cwd(), "src/lib/company-context/ensure-for-generation.ts"),
    "utf8",
  );
  const coverOptions = readFileSync(
    join(process.cwd(), "src/lib/generate/build-cover-letter-options.ts"),
    "utf8",
  );
  const editorPanel = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyContextEditorPanel.tsx"),
    "utf8",
  );

  const noApiKeyResult = await scrapeCompanyWebsiteWithFirecrawl(companySite);
  const legacyNormalized = normalizeCompanyContext({
    companyName: "Acme",
    displayName: "Acme",
    companySummary: "Legacy context without sourceType.",
    productsAndServices: [],
    likelyHiringPriorities: [],
    suggestedNarrativeAngles: [],
    confidence: "low",
    limitations: [],
    generatedAt: "2025-01-01T00:00:00.000Z",
  });

  const checks: [string, boolean][] = [
    ["company homepage URL normalizes", normalizeCompanyWebsiteUrl("acme.com") === "https://acme.com"],
    ["invalid URL rejected", normalizeCompanyWebsiteUrl("not a url") === null],
    ["linkedin job URL detected as job posting", isJobPostingUrl(linkedInJob)],
    ["greenhouse job URL detected as job posting", isJobPostingUrl(job.jobUrl ?? "")],
    ["company homepage is valid research URL", isValidCompanyWebsiteUrl(companySite)],
    ["job posting not used as company website", resolveCompanyWebsiteForResearch(job.jobUrl) === null],
    ["explicit company website resolves", resolveCompanyWebsiteForResearch(companySite) === companySite],
    ["prompt includes firecrawl markdown when provided", promptIncludesWebsiteScrapeContent(promptWithScrape)],
    ["jd-only prompt does not claim website scrape", promptJdOnly.includes("No company website content was scraped")],
    ["fallback is jd-based source type", fallback.sourceType === "jd_based_context"],
    ["mock research with website marks website-backed", mockResearch.sourceType === "website_research"],
    ["mock research uses firecrawl source", hasWebsiteBackedResearch(mockResearch)],
    ["legacy context defaults to jd-based inference", legacyNormalized?.sourceType === "jd_based_context"],
    ["firecrawl helper fails soft without API key", noApiKeyResult.success === false && Boolean(noApiKeyResult.error)],
    ["max content cap is 8k-12k range", FIRECRAWL_MAX_CONTENT_CHARS >= 8000 && FIRECRAWL_MAX_CONTENT_CHARS <= 12000],
    ["research orchestrator calls firecrawl server-side", researchTs.includes("scrapeCompanyWebsiteWithFirecrawl")],
    ["ensure skips firecrawl when no website", ensureTs.includes("resolveCompanyWebsiteForResearch")],
    ["ensure saves jd context without gemini when no website", ensureTs.includes("saveJdBasedContext")],
    ["cover letter options do not use jobUrl as company website", !coverOptions.includes("input.job.jobUrl")],
    ["editor uses refresh terminology", editorPanel.includes("Refresh research")],
    ["editor collapsed optional panel", editorPanel.includes("<details")],
    ["mock without scrape is jd-based", generateMockCompanyContext({ jobDescriptionText: job.rawText, companyName: "Acme" }).sourceType === "jd_based_context"],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll Firecrawl company research checks passed.");
}

void main();
