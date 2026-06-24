import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";
import {
  hasUsableCompanyContext,
  hasWebsiteBackedResearch,
  savedWebsiteContextMatchesTarget,
} from "@/lib/company-context/normalize";
import type { GenerateContextPolicy } from "@/lib/generate/context-policy";
import type { CompanyContext } from "@/types/company-context";

export type CompanyResearchPlan =
  | "use_saved_website"
  | "run_firecrawl"
  | "use_saved_jd"
  | "build_jd"
  | "skip";

export function planCompanyResearchForGeneration(options: {
  savedContext?: CompanyContext | null;
  policy: GenerateContextPolicy;
}): CompanyResearchPlan {
  if (!options.policy.needsCompanyContext) {
    return "skip";
  }

  if (options.policy.kind === "jd_only") {
    if (
      hasUsableCompanyContext(options.savedContext) &&
      !hasWebsiteBackedResearch(options.savedContext)
    ) {
      return "use_saved_jd";
    }
    return "build_jd";
  }

  if (
    options.policy.allowSavedWebsiteContext &&
    hasWebsiteBackedResearch(options.savedContext) &&
    savedWebsiteContextMatchesTarget(
      options.savedContext,
      options.policy.effectiveWebsite,
    )
  ) {
    return "use_saved_website";
  }

  if (options.policy.runWebsiteResearch && options.policy.effectiveWebsite) {
    return "run_firecrawl";
  }

  if (
    hasUsableCompanyContext(options.savedContext) &&
    !hasWebsiteBackedResearch(options.savedContext)
  ) {
    return "use_saved_jd";
  }

  return "build_jd";
}

export function researchProgressLabelForPlan(plan: CompanyResearchPlan): string {
  switch (plan) {
    case "use_saved_website":
      return "Using saved company research";
    case "run_firecrawl":
      return "Researching company website";
    case "use_saved_jd":
    case "build_jd":
      return "Using JD-based context";
    case "skip":
      return "Skipping website research";
  }
}

export function researchProgressLabelAfterEnsure(
  status: CompanyContextEnsureStatus,
  hadWarning: boolean,
): string {
  switch (status) {
    case "saved":
      return "Using saved company research";
    case "auto_generated":
      return "Researching company website";
    case "jd_fallback":
      return hadWarning
        ? "Company research failed; continuing with JD context"
        : "Using JD-based context";
    case "failed":
      return "Company research failed; continuing with JD context";
    case "skipped":
      return "Skipping website research";
  }
}

export const COMBINED_PROGRESS_STAGE_SHELL = [
  "Saving job details",
  "Preparing application record",
  "RESEARCH_PLACEHOLDER",
  "Building resume evidence",
  "Generating tailored resume",
  "Generating cover letter",
  "Saving drafts",
] as const;

export const RESUME_ONLY_PROGRESS_STAGES = [
  "Saving job details",
  "Preparing application record",
  "Building resume evidence",
  "Generating tailored resume",
  "Saving draft",
] as const;

export function buildCombinedProgressStages(researchLabel: string): string[] {
  return COMBINED_PROGRESS_STAGE_SHELL.map((stage) =>
    stage === "RESEARCH_PLACEHOLDER" ? researchLabel : stage,
  );
}

export function combinedProgressResearchStageIndex(): number {
  return COMBINED_PROGRESS_STAGE_SHELL.indexOf("RESEARCH_PLACEHOLDER");
}

export function getGenerationStageIndices(combinedMode: boolean) {
  if (combinedMode) {
    return {
      savingJob: 0,
      preparingApplication: 1,
      companyResearch: 2,
      buildingEvidence: 3,
      generatingResume: 4,
      generatingCoverLetter: 5,
      savingDrafts: 6,
      total: 7,
    } as const;
  }

  return {
    savingJob: 0,
    preparingApplication: 1,
    buildingEvidence: 2,
    generatingResume: 3,
    savingDrafts: 4,
    total: 5,
  } as const;
}
