"use client";

import { formatRiskFlagLabel } from "@/lib/resume-draft/preview-helpers";
import type { PageFitEstimate, ResumeFitAssessment } from "@/lib/resume-draft/layout";
import type { ResumeDraftServerPdfValidation } from "@/types/resume-draft";

import { SetupCard } from "@/components/setup/ui";

type ResumeAssessmentPanelProps = {
  assessment: ResumeFitAssessment;
  pageFit: PageFitEstimate;
  optimizationNote?: string;
  serverPdfValidation?: ResumeDraftServerPdfValidation | null;
  validationFailure?: {
    pageCount: number;
    message: string;
    suggestedActions?: string[];
    overflowPx?: number;
    overflowMm?: number;
  } | null;
  isValidating?: boolean;
};

export function ResumeAssessmentPanel({
  assessment,
  pageFit,
  optimizationNote,
  serverPdfValidation,
  validationFailure,
  isValidating = false,
}: ResumeAssessmentPanelProps) {
  const serverValidated =
    serverPdfValidation?.pageCount === 1 && !validationFailure && !isValidating;

  return (
    <SetupCard
      title="Resume Assessment"
      description="Resume–Job Fit uses preview-fit-heuristic-v1 (provisional). Server PDF page count is export truth after Approve."
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
            Layout estimate (heuristic)
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {pageFit.exceedsOnePage
              ? `~${pageFit.overflowLines} line(s) over`
              : "Within one-page estimate"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Non-authoritative · {pageFit.estimatedLines} lines · ~
            {pageFit.estimatedPages.toFixed(1)} page(s) at {pageFit.bodyFontPx}px
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Server PDF validation (export truth)
        </p>
        {isValidating ? (
          <p className="mt-2 text-sm text-slate-700">Validating server PDF layout…</p>
        ) : validationFailure ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm font-semibold text-red-800">
              {validationFailure.pageCount} page(s) — export blocked
              {validationFailure.overflowMm && validationFailure.overflowMm > 0
                ? ` (~${validationFailure.overflowMm.toFixed(1)} mm overflow)`
                : ""}
            </p>
            <p className="text-sm text-red-800">{validationFailure.message}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
              {(validationFailure.suggestedActions ?? []).map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        ) : serverValidated ? (
          <p className="mt-2 text-sm text-emerald-800">
            Server PDF: {serverPdfValidation.pageCount} page — approved for export (
            {new Date(serverPdfValidation.validatedAt).toLocaleString()}).
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Not validated yet. Click Approve for Export to run server PDF layout check (may take
            several seconds).
          </p>
        )}
      </div>

      {optimizationNote ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {optimizationNote}
        </p>
      ) : null}

      {pageFit.exceedsOnePage && !serverValidated ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Heuristic suggests overflow. Tighten layout or shorten content before Approve — server
          validation is final.
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
