import {
  hasUsableCompanyContext,
  hasWebsiteBackedResearch,
} from "@/lib/company-context/normalize";
import { planCompanyResearchForGeneration } from "@/lib/company-context/research-plan";
import type { CompanyContext } from "@/types/company-context";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";

export type CompanyResearchDisplayStatus =
  | "website_saved"
  | "jd_saved"
  | "will_auto_research"
  | "will_jd_only"
  | "research_failed"
  | "unavailable";

export function resolveCompanyResearchDisplayStatus(options: {
  savedContext?: CompanyContext | null;
  lastEnsureStatus?: CompanyContextEnsureStatus;
  combinedMode: boolean;
  companyWebsite?: string;
  hadResearchWarning?: boolean;
}): CompanyResearchDisplayStatus {
  if (!options.combinedMode) {
    return "unavailable";
  }

  if (hasWebsiteBackedResearch(options.savedContext)) {
    return "website_saved";
  }

  const plan = planCompanyResearchForGeneration({
    savedContext: options.savedContext,
    companyWebsite: options.companyWebsite,
    combinedMode: true,
  });

  if (
    options.lastEnsureStatus === "failed" ||
    (options.lastEnsureStatus === "jd_fallback" && options.hadResearchWarning)
  ) {
    return "research_failed";
  }

  if (plan === "run_firecrawl") {
    return "will_auto_research";
  }

  if (plan === "use_saved_jd" || plan === "build_jd") {
    return hasUsableCompanyContext(options.savedContext) ? "jd_saved" : "will_jd_only";
  }

  return "will_jd_only";
}

export function formatCompanyResearchStatusLabel(status: CompanyResearchDisplayStatus): string {
  switch (status) {
    case "website_saved":
      return "Company research: website-backed research saved";
    case "jd_saved":
      return "Company research: JD-based fallback only";
    case "will_auto_research":
      return "Company research: will run automatically";
    case "will_jd_only":
      return "Company research: JD-based fallback only";
    case "research_failed":
      return "Company research: failed last time; will retry if website is provided";
    case "unavailable":
      return "Company research: not used (resume only)";
  }
}
