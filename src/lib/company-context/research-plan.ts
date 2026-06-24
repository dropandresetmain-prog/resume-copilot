import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";
import {
  hasUsableCompanyContext,
  hasWebsiteBackedResearch,
} from "@/lib/company-context/normalize";
import { resolveCompanyWebsiteForResearch } from "@/lib/firecrawl/url";
import type { CompanyContext } from "@/types/company-context";

export type CompanyResearchPlan =
  | "use_saved_website"
  | "run_firecrawl"
  | "use_saved_jd"
  | "build_jd"
  | "skip";

export function planCompanyResearchForGeneration(options: {
  savedContext?: CompanyContext | null;
  companyWebsite?: string;
  combinedMode: boolean;
  skipWebsiteResearch?: boolean;
}): CompanyResearchPlan {
  if (!options.combinedMode) {
    return "skip";
  }

  if (options.skipWebsiteResearch) {
    if (hasUsableCompanyContext(options.savedContext)) {
      return "use_saved_jd";
    }
    return "build_jd";
  }

  if (hasWebsiteBackedResearch(options.savedContext)) {
    return "use_saved_website";
  }

  const website = resolveCompanyWebsiteForResearch(options.companyWebsite);
  if (!website) {
    if (hasUsableCompanyContext(options.savedContext)) {
      return "use_saved_jd";
    }
    return "build_jd";
  }

  return "run_firecrawl";
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
