import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
import { formatSavedJobLabel } from "@/lib/jd/labels";
import type { StoredApplicationRecord } from "@/types/application-record";
import type { StoredJobDescription } from "@/types/jd";

export function formatApplicationLabel(
  record: StoredApplicationRecord,
  job?: StoredJobDescription,
): string {
  const company = formatCompanyNameForDisplay({
    rawName: record.companyName ?? job?.companyName,
    website: record.companyContext?.website ?? job?.jobUrl,
    savedDisplayName: record.companyContext?.displayName,
    fallback: "",
  });
  const role = record.roleTitle?.trim() || job?.roleTitle?.trim();

  if (role && company) {
    return `${role} @ ${company}`;
  }
  if (job) {
    return formatSavedJobLabel(job);
  }
  return role ?? company ?? "Application";
}

export function applicationStatusBadgeClassName(status: string): string {
  switch (status) {
    case "drafting":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "resume_generated":
      return "border-cyan-200 bg-cyan-50 text-cyan-800";
    case "ready_to_apply":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "applied":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-800";
    case "archived":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function formatApplicationStatusLabel(status: string): string {
  switch (status) {
    case "drafting":
      return "Drafting";
    case "resume_generated":
      return "Resume generated";
    case "ready_to_apply":
      return "Ready to apply";
    case "applied":
      return "Applied";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
