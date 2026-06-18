"use client";

import { formatRiskFlagLabel } from "@/lib/resume-draft/preview-helpers";
import type { ResumeFitAssessment } from "@/lib/resume-draft/layout";

import { SetupCard } from "@/components/setup/ui";

type ResumeAssessmentPanelProps = {
  assessment: ResumeFitAssessment;
};

export function ResumeAssessmentPanel({ assessment }: ResumeAssessmentPanelProps) {
  return (
    <SetupCard title="Resume Assessment" description="AI-assisted fit summary for this draft.">
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fit Score</p>
        <p className="mt-1 text-4xl font-bold text-slate-900">
          {assessment.fitScore}
          <span className="text-lg font-medium text-slate-500"> / 100</span>
        </p>
      </div>

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
