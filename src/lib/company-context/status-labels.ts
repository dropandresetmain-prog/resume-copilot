import {
  hasUsableCompanyContext,
  hasWebsiteBackedResearch,
} from "@/lib/company-context/normalize";
import { planCompanyResearchForGeneration } from "@/lib/company-context/research-plan";
import type { GenerateContextPolicy } from "@/lib/generate/context-policy";
import type { CompanyContext } from "@/types/company-context";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";

export type CompanyResearchDisplayStatus =
  | "website_saved"
  | "jd_saved"
  | "will_auto_research"
  | "will_jd_only"
  | "confidential_jd_only"
  | "research_failed"
  | "unavailable";

export function resolveCompanyResearchDisplayStatus(options: {
  savedContext?: CompanyContext | null;
  lastEnsureStatus?: CompanyContextEnsureStatus;
  policy: GenerateContextPolicy;
  hadResearchWarning?: boolean;
}): CompanyResearchDisplayStatus {
  if (!options.policy.needsCompanyContext) {
    return "unavailable";
  }

  if (options.policy.kind === "jd_only" && !options.policy.allowSavedWebsiteContext) {
    if (
      hasUsableCompanyContext(options.savedContext) &&
      !hasWebsiteBackedResearch(options.savedContext)
    ) {
      return "jd_saved";
    }
    if (options.policy.summaryDetail.includes("Confidential")) {
      return "confidential_jd_only";
    }
    return "will_jd_only";
  }

  if (hasWebsiteBackedResearch(options.savedContext)) {
    return "website_saved";
  }

  const plan = planCompanyResearchForGeneration({
    savedContext: options.savedContext,
    policy: options.policy,
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
      return "Company research: JD-based context saved";
    case "will_auto_research":
      return "Company research: will run automatically";
    case "will_jd_only":
      return "Company research: JD-based context only";
    case "confidential_jd_only":
      return "Company research: JD-only (confidential posting)";
    case "research_failed":
      return "Company research: failed last time; will retry if website is provided";
    case "unavailable":
      return "Company research: not used (resume only)";
  }
}
