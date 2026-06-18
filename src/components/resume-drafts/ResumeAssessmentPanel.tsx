"use client";

import { formatRiskFlagLabel } from "@/lib/resume-draft/preview-helpers";
import type { PageFitEstimate, ResumeFitAssessment } from "@/lib/resume-draft/layout";

import { SetupCard } from "@/components/setup/ui";

type ResumeAssessmentPanelProps = {
  assessment: ResumeFitAssessment;
  pageFit: PageFitEstimate;
  optimizationNote?: string;
};

export function ResumeAssessmentPanel({
  assessment,
  pageFit,
  optimizationNote,
}: ResumeAssessmentPanelProps) {
  return (
    <SetupCard
      title="Resume Assessment"
      description="Role match and one-page layout fit are shown separately."
    >
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resume–Job Fit
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {assessment.fitScore}
            <span className="text-base font-medium text-slate-500"> / 100</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Layout Fit (One Page)
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {pageFit.exceedsOnePage
              ? `~${pageFit.overflowLines} line(s) over`
              : "Fits one-page estimate"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {pageFit.estimatedLines} lines · ~{pageFit.estimatedPages.toFixed(1)} page(s) at{" "}
            {pageFit.bodyFontPx}px
          </p>
        </div>
      </div>

      {optimizationNote ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {optimizationNote}
        </p>
      ) : null}

      {pageFit.exceedsOnePage ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Layout still exceeds one page. Consider shortening bullets, removing low-confidence items,
          or combining related points in Edit Resume Details.
        </p>
      ) : null}

      <div className="mt-4 space-y-4 text-sm text-slate-700">
        <section>
          <h3 className="font-semibold text-slate-900">What the AI optimized</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {assessment.optimizedFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-slate-900">Why this score was assigned</h3>
          <p className="mt-2">{assessment.scoreRationale}</p>
        </section>

        <section>
          <h3 className="font-semibold text-slate-900">Key strengths</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {assessment.keyStrengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {assessment.riskFlags.length > 0 ? (
          <section>
            <h3 className="font-semibold text-slate-900">Risk flags</h3>
            <ul className="mt-2 space-y-2">
              {assessment.riskFlags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
                >
                  {formatRiskFlagLabel(flag)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SetupCard>
  );
}
