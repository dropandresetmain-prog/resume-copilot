"use client";

import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
import { isApprovedDraftStatus } from "@/lib/resume-draft/draft-status";
import { hasWebsiteBackedResearch } from "@/lib/company-context/normalize";
import type { CompanyContext } from "@/types/company-context";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ApplicationPackageSummaryProps = {
  companyName?: string;
  roleTitle?: string;
  resumeDraft: GeneratedResumeDraftRecord;
  coverLetter: GeneratedCoverLetterDraftRecord | null;
  coverLetterLoading: boolean;
  companyContext: CompanyContext | null;
};

function resumeStatusLabel(draft: GeneratedResumeDraftRecord): string {
  if (draft.status === "needs_review") {
    return "Needs structure review";
  }
  if (isApprovedDraftStatus(draft.status)) {
    return draft.content.serverPdfValidation?.pageCount === 1
      ? "Approved for export"
      : "Approved — re-validate export";
  }
  if (draft.status === "layout_changed") {
    return "Layout changed — re-approve";
  }
  return "Draft — approve to export";
}

function coverLetterStatusLabel(
  coverLetter: GeneratedCoverLetterDraftRecord | null,
  loading: boolean,
): string {
  if (loading) {
    return "Checking…";
  }
  if (coverLetter) {
    return "Generated";
  }
  return "Not generated";
}

function companyResearchStatusLabel(context: CompanyContext | null): string {
  if (!context) {
    return "None saved";
  }
  if (hasWebsiteBackedResearch(context)) {
    return "Website-backed research saved";
  }
  return "JD-based context saved";
}

export function ApplicationPackageSummary({
  companyName,
  roleTitle,
  resumeDraft,
  coverLetter,
  coverLetterLoading,
  companyContext,
}: ApplicationPackageSummaryProps) {
  const displayCompany = formatCompanyNameForDisplay({
    rawName: companyName,
    website: companyContext?.website,
    savedDisplayName: companyContext?.displayName,
  });
  const displayRole = roleTitle || resumeDraft.content.targetRoleTitle || "Role TBD";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Application package
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {displayCompany} · {displayRole}
          </h2>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-slate-500">Resume</dt>
          <dd className="font-medium text-slate-900">{resumeStatusLabel(resumeDraft)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Cover letter</dt>
          <dd className="font-medium text-slate-900">
            {coverLetterStatusLabel(coverLetter, coverLetterLoading)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Company research</dt>
          <dd className="font-medium text-slate-900">
            {companyResearchStatusLabel(companyContext)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Package</dt>
          <dd className="font-medium text-slate-900">Ready for review</dd>
        </div>
      </dl>
    </div>
  );
}
