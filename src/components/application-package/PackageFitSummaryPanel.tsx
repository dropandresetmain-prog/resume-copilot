"use client";

import {
  buildPackageFitSummary,
  PACKAGE_FIT_SUMMARY_UNAVAILABLE,
} from "@/lib/package/fit-summary";
import type { ResumeFitAssessment } from "@/lib/resume-draft/layout";
import type { ResumeDraftRationale } from "@/types/resume-draft";

type PackageFitSummaryPanelProps = {
  rationale?: ResumeDraftRationale | null;
  fitAssessment?: ResumeFitAssessment | null;
};

export function PackageFitSummaryPanel({
  rationale,
  fitAssessment,
}: PackageFitSummaryPanelProps) {
  const summary = buildPackageFitSummary({ rationale, fitAssessment });

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="package-fit-summary"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        AI fit summary
      </p>
      {summary ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{summary}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">{PACKAGE_FIT_SUMMARY_UNAVAILABLE}</p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Derived from saved generation output — not generated on page load.
      </p>
    </div>
  );
}
