import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFallbackCompanyContext } from "../../src/lib/company-context/build-company-context";
import {
  buildCombinedProgressStages,
  combinedProgressResearchStageIndex,
  getGenerationStageIndices,
  planCompanyResearchForGeneration,
  researchProgressLabelAfterEnsure,
  researchProgressLabelForPlan,
} from "../../src/lib/company-context/research-plan";
import { hasWebsiteBackedResearch, savedWebsiteContextMatchesTarget } from "../../src/lib/company-context/normalize";
import { resolveGenerateContextPolicy } from "../../src/lib/generate/context-policy";
import { generationProgressPercent } from "../../src/lib/generate/generation-progress";

async function main() {
  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const editorPanel = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyContextEditorPanel.tsx"),
    "utf8",
  );
  const progressPanel = readFileSync(
    join(process.cwd(), "src/components/setup/GenerationProgressPanel.tsx"),
    "utf8",
  );
  const ensureTs = readFileSync(
    join(process.cwd(), "src/lib/company-context/ensure-for-generation.ts"),
    "utf8",
  );

  const jdOnly = buildFallbackCompanyContext({
    companyName: "Acme Corp",
    jobDescriptionText: "Product Manager role.",
  });

  const websitePolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    companyWebsiteInput: "https://acme.com",
    outputMode: "resume_and_cover_letter",
  });
  const jdOnlyPolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
  });
  const confidentialPolicy = resolveGenerateContextPolicy({
    confidentialPosting: true,
    companyWebsiteInput: "https://acme.com",
    outputMode: "resume_and_cover_letter",
  });
  const resumeOnlyPolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    companyWebsiteInput: "https://acme.com",
    outputMode: "resume_only",
  });

  const combinedStages = buildCombinedProgressStages("Researching company website");
  const combinedIndices = getGenerationStageIndices(true);
  const resumeOnlyIndices = getGenerationStageIndices(false);

  const checks: [string, boolean][] = [
    [
      "combined mode plans firecrawl when website and no website-backed research",
      planCompanyResearchForGeneration({
        savedContext: null,
        policy: websitePolicy,
      }) === "run_firecrawl",
    ],
    [
      "saved website-backed research skips firecrawl when domain matches",
      planCompanyResearchForGeneration({
        savedContext: {
          ...jdOnly,
          sourceType: "website_research",
          website: "https://acme.com",
          sources: [{ type: "firecrawl", url: "https://acme.com", success: true }],
        },
        policy: websitePolicy,
      }) === "use_saved_website",
    ],
    [
      "saved website-backed research reruns when domain differs",
      planCompanyResearchForGeneration({
        savedContext: {
          ...jdOnly,
          sourceType: "website_research",
          website: "https://oldco.com",
          sources: [{ type: "firecrawl", url: "https://oldco.com", success: true }],
        },
        policy: websitePolicy,
      }) === "run_firecrawl" &&
        !savedWebsiteContextMatchesTarget(
          {
            ...jdOnly,
            sourceType: "website_research",
            website: "https://oldco.com",
            sources: [{ type: "firecrawl", url: "https://oldco.com", success: true }],
          },
          websitePolicy.effectiveWebsite,
        ),
    ],
    [
      "no website skips firecrawl",
      planCompanyResearchForGeneration({
        savedContext: null,
        policy: jdOnlyPolicy,
      }) === "build_jd",
    ],
    [
      "confidential policy plans jd path even with website",
      planCompanyResearchForGeneration({
        savedContext: null,
        policy: confidentialPolicy,
      }) === "build_jd",
    ],
    [
      "confidential policy uses saved jd context when present",
      planCompanyResearchForGeneration({
        savedContext: jdOnly,
        policy: confidentialPolicy,
      }) === "use_saved_jd",
    ],
    [
      "jd-only saved with website still plans firecrawl",
      planCompanyResearchForGeneration({
        savedContext: jdOnly,
        policy: websitePolicy,
      }) === "run_firecrawl",
    ],
    [
      "jd-only saved without website uses saved jd",
      planCompanyResearchForGeneration({
        savedContext: jdOnly,
        policy: jdOnlyPolicy,
      }) === "use_saved_jd",
    ],
    [
      "resume only skips company research plan",
      planCompanyResearchForGeneration({
        savedContext: null,
        policy: resumeOnlyPolicy,
      }) === "skip",
    ],
    [
      "research progress label for firecrawl plan",
      researchProgressLabelForPlan("run_firecrawl") === "Researching company website",
    ],
    [
      "research progress label after failure",
      researchProgressLabelAfterEnsure("jd_fallback", true) ===
        "Company research failed; continuing with JD context",
    ],
    [
      "combined progress includes research stage",
      combinedStages[combinedProgressResearchStageIndex()] === "Researching company website",
    ],
    [
      "combined progress has seven stages",
      combinedStages.length === 7 && combinedIndices.total === 7,
    ],
    [
      "resume-only progress has five stages",
      resumeOnlyIndices.total === 5 && resumeOnlyIndices.companyResearch === undefined,
    ],
    [
      "progress percent uses dynamic stage count",
      generationProgressPercent(0, combinedStages.length) <
        generationProgressPercent(combinedStages.length - 1, combinedStages.length),
    ],
    [
      "ensure supports allow saved website flag",
      ensureTs.includes("allowSavedWebsiteContext"),
    ],
    [
      "ensure only reuses website-backed when domain matches",
      ensureTs.includes("savedWebsiteContextMatchesTarget"),
    ],
    ["generate section passes dynamic stages", generateSection.includes("stages={progressStages}")],
    [
      "generate section plans research before ensure",
      generateSection.includes("planCompanyResearchForGeneration"),
    ],
    [
      "editor collapsed by default",
      editorPanel.includes("<details") && editorPanel.includes("View / edit company research"),
    ],
    [
      "editor refresh is secondary action",
      editorPanel.includes("Refresh research") && !editorPanel.includes("Research Company Website"),
    ],
    [
      "progress panel accepts custom stages",
      progressPanel.includes("stages: string[]"),
    ],
    [
      "jd fallback is not website-backed",
      !hasWebsiteBackedResearch(jdOnly),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll research progress checks passed.");
}

void main();
