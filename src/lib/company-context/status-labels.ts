import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import type { CompanyContext } from "@/types/company-context";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";

export type CompanyContextDisplayStatus =
  | "saved"
  | "will_auto_generate"
  | "failed"
  | "unavailable";

export function resolveCompanyContextDisplayStatus(options: {
  savedContext?: CompanyContext | null;
  lastEnsureStatus?: CompanyContextEnsureStatus;
  combinedMode: boolean;
}): CompanyContextDisplayStatus {
  if (hasUsableCompanyContext(options.savedContext)) {
    return "saved";
  }
  if (options.lastEnsureStatus === "failed") {
    return "failed";
  }
  if (!options.combinedMode) {
    return "unavailable";
  }
  return "will_auto_generate";
}

export function formatCompanyContextStatusLabel(status: CompanyContextDisplayStatus): string {
  switch (status) {
    case "saved":
      return "Company Context: Saved";
    case "will_auto_generate":
      return "Company Context: Will auto-generate";
    case "failed":
      return "Company Context: Not available / failed";
    case "unavailable":
      return "Company Context: Not used (resume only)";
  }
}
