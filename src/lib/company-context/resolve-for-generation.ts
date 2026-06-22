import {
  buildFallbackCompanyContext,
  resolveCompanyNameForGeneration,
} from "@/lib/company-context/build-company-context";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import type { CompanyContext, CompanyContextInput } from "@/types/company-context";

export function resolveCompanyContextForGeneration(options: {
  savedContext?: CompanyContext | null;
  input: CompanyContextInput;
}): CompanyContext {
  if (hasUsableCompanyContext(options.savedContext)) {
    return options.savedContext;
  }

  return buildFallbackCompanyContext({
    ...options.input,
    companyName: resolveCompanyNameForGeneration({
      override: options.input.companyName,
      jobDescriptionText: options.input.jobDescriptionText,
    }),
  });
}
