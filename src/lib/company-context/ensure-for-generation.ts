import {
  buildCompanyContextGenerationRequest,
  requestCompanyContextGeneration,
} from "@/lib/company-context/client";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import { resolveCompanyNameForGeneration } from "@/lib/company-context/build-company-context";
import { saveApplicationCompanyContextInCloud } from "@/lib/supabase/application-records";
import type { CompanyContext } from "@/types/company-context";
import type { StoredJobDescription } from "@/types/jd";

export type CompanyContextEnsureStatus =
  | "saved"
  | "auto_generated"
  | "failed"
  | "skipped";

export type CompanyContextEnsureResult = {
  companyContext?: CompanyContext;
  status: CompanyContextEnsureStatus;
  warning?: string;
};

export const COMPANY_CONTEXT_AUTO_FAIL_WARNING =
  "Company context generation failed. Resume and cover letter used JD/company fields only. You can retry company context later.";

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

export async function ensureCompanyContextForGeneration(
  input: EnsureCompanyContextInput,
): Promise<CompanyContextEnsureResult> {
  if (hasUsableCompanyContext(input.savedContext)) {
    return {
      companyContext: input.savedContext,
      status: "saved",
    };
  }

  if (!input.autoGenerate) {
    return { status: "skipped" };
  }

  const companyName = resolveCompanyNameForGeneration({
    override: input.companyNameOverride || input.job.companyName,
    jobCompanyName: input.job.companyName,
    jobDescriptionText: input.job.rawText,
  });

  if (!companyName.trim() || companyName === "the company") {
    return {
      status: "failed",
      warning: COMPANY_CONTEXT_AUTO_FAIL_WARNING,
    };
  }

  try {
    const generated = await requestCompanyContextGeneration(
      buildCompanyContextGenerationRequest({
        jobDescriptionId: input.job.id,
        jobDescriptionText: input.job.rawText,
        companyName,
        country: input.country,
        website: input.companyWebsite || input.job.jobUrl,
        roleTitle: input.job.roleTitle,
        additionalInstructions: input.additionalInstructions,
      }),
    );

    const saved = await saveApplicationCompanyContextInCloud(input.applicationId, generated);
    const companyContext = saved.companyContext ?? generated;

    return {
      companyContext,
      status: "auto_generated",
    };
  } catch {
    return {
      status: "failed",
      warning: COMPANY_CONTEXT_AUTO_FAIL_WARNING,
    };
  }
}
