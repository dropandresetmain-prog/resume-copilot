import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFallbackCompanyContext } from "../src/lib/company-context/build-company-context";
import {
  buildCombinedProgressStages,
  combinedProgressResearchStageIndex,
  getGenerationStageIndices,
  planCompanyResearchForGeneration,
  researchProgressLabelAfterEnsure,
  researchProgressLabelForPlan,
} from "../src/lib/company-context/research-plan";
import { hasWebsiteBackedResearch } from "../src/lib/company-context/normalize";
import { generationProgressPercent } from "../src/lib/generate/generation-progress";

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

  const combinedStages = buildCombinedProgressStages("Researching company website");
  const combinedIndices = getGenerationStageIndices(true);
  const resumeOnlyIndices = getGenerationStageIndices(false);

  const checks: [string, boolean][] = [
    [
      "combined mode plans firecrawl when website and no website-backed research",
      planCompanyResearchForGeneration({
        savedContext: null,
        companyWebsite: "https://acme.com",
        combinedMode: true,
      }) === "run_firecrawl",
    ],
    [
      "saved website-backed research skips firecrawl",
      planCompanyResearchForGeneration({
        savedContext: {
          ...jdOnly,
          sourceType: "website_research",
          sources: [{ type: "firecrawl", url: "https://acme.com", success: true }],
        },
        companyWebsite: "https://acme.com",
        combinedMode: true,
      }) === "use_saved_website",
    ],
    [
      "no website skips firecrawl",
      planCompanyResearchForGeneration({
        savedContext: null,
        companyWebsite: "",
        combinedMode: true,
      }) === "build_jd",
    ],
    [
      "jd-only saved with website still plans firecrawl",
      planCompanyResearchForGeneration({
        savedContext: jdOnly,
        companyWebsite: "https://acme.com",
        combinedMode: true,
      }) === "run_firecrawl",
    ],
    [
      "jd-only saved without website uses saved jd",
      planCompanyResearchForGeneration({
        savedContext: jdOnly,
        companyWebsite: "",
        combinedMode: true,
      }) === "use_saved_jd",
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
      "ensure only reuses website-backed early",
      ensureTs.includes("hasWebsiteBackedResearch(input.savedContext)") &&
        !ensureTs.includes("if (hasUsableCompanyContext(input.savedContext)) {\n    return"),
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
