import {
  buildCompanyContextGenerationRequest,
  requestCompanyContextGeneration,
} from "@/lib/company-context/client";
import { buildFallbackCompanyContext } from "@/lib/company-context/build-company-context";
import {
  hasUsableCompanyContext,
  hasWebsiteBackedResearch,
} from "@/lib/company-context/normalize";
import { resolveCompanyNameForGeneration } from "@/lib/company-context/build-company-context";
import {
  clearApplicationCompanyResearchInCloud,
  saveApplicationCompanyContextInCloud,
} from "@/lib/supabase/application-records";
import { resolveCompanyWebsiteForResearch } from "@/lib/firecrawl/url";
import type { CompanyContext } from "@/types/company-context";
import type { StoredJobDescription } from "@/types/jd";

export type CompanyContextEnsureStatus =
  | "saved"
  | "auto_generated"
  | "jd_fallback"
  | "failed"
  | "skipped";

export type CompanyContextEnsureResult = {
  companyContext?: CompanyContext;
  status: CompanyContextEnsureStatus;
  warning?: string;
};

export const COMPANY_RESEARCH_WEBSITE_FAIL_WARNING =
  "Website research failed; using JD-based context. Resume and cover letter generation continued. You can retry research later.";

export const COMPANY_RESEARCH_AUTO_FAIL_WARNING =
  "Company research failed. Resume and cover letter used JD-based context only. You can retry research later.";

export type EnsureCompanyContextInput = {
  applicationId: string;
  savedContext?: CompanyContext | null;
  job: StoredJobDescription;
  companyNameOverride?: string;
  country?: string;
  companyWebsite?: string;
  additionalInstructions?: string;
  autoGenerate: boolean;
};

async function saveJdBasedContext(
  applicationId: string,
  input: {
    companyName: string;
    country?: string;
    website?: string;
    job: StoredJobDescription;
    additionalInstructions?: string;
  },
): Promise<CompanyContext> {
  const fallback = buildFallbackCompanyContext({
    companyName: input.companyName,
    country: input.country,
    website: input.website,
    jobDescriptionText: input.job.rawText,
    roleTitle: input.job.roleTitle,
    additionalInstructions: input.additionalInstructions,
  });
  const saved = await saveApplicationCompanyContextInCloud(applicationId, fallback);
  return saved.companyContext ?? fallback;
}

export async function ensureCompanyContextForGeneration(
  input: EnsureCompanyContextInput,
): Promise<CompanyContextEnsureResult> {
  const website = resolveCompanyWebsiteForResearch(input.companyWebsite);

  if (hasWebsiteBackedResearch(input.savedContext)) {
    return {
      companyContext: input.savedContext,
      status: "saved",
    };
  }

  if (!input.autoGenerate) {
    if (hasUsableCompanyContext(input.savedContext)) {
      return {
        companyContext: input.savedContext,
        status: "saved",
      };
    }
    return { status: "skipped" };
  }

  if (!website && hasUsableCompanyContext(input.savedContext)) {
    return {
      companyContext: input.savedContext,
      status: "saved",
    };
  }

  const companyName = resolveCompanyNameForGeneration({
    override: input.companyNameOverride || input.job.companyName,
    jobCompanyName: input.job.companyName,
    jobDescriptionText: input.job.rawText,
  });

  if (!companyName.trim() || companyName === "the company") {
    return {
      status: "failed",
      warning: COMPANY_RESEARCH_AUTO_FAIL_WARNING,
    };
  }

  const companyWebsite = website;

  if (!companyWebsite) {
    try {
      const companyContext = await saveJdBasedContext(input.applicationId, {
        companyName,
        country: input.country,
        job: input.job,
        additionalInstructions: input.additionalInstructions,
      });
      return {
        companyContext,
        status: "jd_fallback",
      };
    } catch {
      return {
        status: "failed",
        warning: COMPANY_RESEARCH_AUTO_FAIL_WARNING,
      };
    }
  }

  try {
    const generated = await requestCompanyContextGeneration(
      buildCompanyContextGenerationRequest({
        jobDescriptionId: input.job.id,
        jobDescriptionText: input.job.rawText,
        companyName,
        country: input.country,
        website: companyWebsite,
        roleTitle: input.job.roleTitle,
        additionalInstructions: input.additionalInstructions,
      }),
    );

    const saved = await saveApplicationCompanyContextInCloud(input.applicationId, generated);
    const companyContext = saved.companyContext ?? generated;

    if (generated.researchWarning || !hasWebsiteBackedResearch(companyContext)) {
      return {
        companyContext,
        status: hasWebsiteBackedResearch(companyContext) ? "auto_generated" : "jd_fallback",
        warning: generated.researchWarning ?? COMPANY_RESEARCH_WEBSITE_FAIL_WARNING,
      };
    }

    return {
      companyContext,
      status: "auto_generated",
    };
  } catch {
    try {
      const companyContext = await saveJdBasedContext(input.applicationId, {
        companyName,
        country: input.country,
        website: companyWebsite,
        job: input.job,
        additionalInstructions: input.additionalInstructions,
      });
      return {
        companyContext,
        status: "jd_fallback",
        warning: COMPANY_RESEARCH_WEBSITE_FAIL_WARNING,
      };
    } catch {
      return {
        status: "failed",
        warning: COMPANY_RESEARCH_AUTO_FAIL_WARNING,
      };
    }
  }
}

export { clearApplicationCompanyResearchInCloud };
