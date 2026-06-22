import {
  hasUsableCompanyContext,
  hasWebsiteBackedResearch,
} from "@/lib/company-context/normalize";
import type { CompanyContext } from "@/types/company-context";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";
import { resolveCompanyWebsiteForResearch } from "@/lib/firecrawl/url";

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
}): CompanyResearchDisplayStatus {
  if (hasUsableCompanyContext(options.savedContext)) {
    return hasWebsiteBackedResearch(options.savedContext)
      ? "website_saved"
      : "jd_saved";
  }
  if (options.lastEnsureStatus === "failed") {
    return "research_failed";
  }
  if (!options.combinedMode) {
    return "unavailable";
  }
  if (resolveCompanyWebsiteForResearch(options.companyWebsite)) {
    return "will_auto_research";
  }
  return "will_jd_only";
}

export function formatCompanyResearchStatusLabel(status: CompanyResearchDisplayStatus): string {
  switch (status) {
    case "website_saved":
      return "Website-backed research saved";
    case "jd_saved":
      return "JD-based context only";
    case "will_auto_research":
      return "Will auto-research company website";
    case "will_jd_only":
      return "No company research saved (JD-based on generate)";
    case "research_failed":
      return "Website research failed; using JD-based fallback";
    case "unavailable":
      return "Company research not used (resume only)";
  }
}
