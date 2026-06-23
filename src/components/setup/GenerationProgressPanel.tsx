"use client";

import { generationProgressPercent } from "@/lib/generate/generation-progress";

const STAGE_HINTS: Record<string, string> = {
  "Saving job": "Storing this role so your application package stays linked to the right posting.",
  "Preparing application": "Creating or updating your application record for this job.",
  "Researching company website": "Gathering public company context to strengthen your cover letter.",
  "Using saved company research": "Reusing verified research from a previous run — no redundant scrape.",
  "Building evidence spine": "Ranking inventory bullets and experiences that best match this role.",
  "Generating tailored resume": "Drafting role-specific resume content from your career inventory.",
  "Generating cover letter": "Writing a formal cover letter aligned to the job and company context.",
  "Saving drafts": "Persisting your resume and cover letter drafts to the cloud.",
};

function stageHint(stageLabel: string): string {
  const normalized = stageLabel.replace(/\s*\(.*\)$/, "").trim();
  for (const [key, hint] of Object.entries(STAGE_HINTS)) {
    if (normalized.startsWith(key) || stageLabel.includes(key)) {
      return hint;
    }
  }
  return "Working through your application package — this usually takes under a minute.";
}

type GenerationProgressPanelProps = {
  stageIndex: number;
  stages: string[];
  title?: string;
  className?: string;
};

export function GenerationProgressPanel({
  stageIndex,
  stages,
  title = "Generating tailored resume",
  className = "",
}: GenerationProgressPanelProps) {
  const percent = generationProgressPercent(stageIndex, stages.length);
  const label = stages[stageIndex] ?? stages[0] ?? "Working";
  const hint = stageHint(label);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 p-6 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="relative mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-cyan-200 bg-white"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/25" />
          <span className="relative size-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-medium text-cyan-900">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
        </div>
        <p className="shrink-0 text-2xl font-semibold tabular-nums text-slate-400">{percent}%</p>
      </div>

      <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-cyan-600 to-slate-900 transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        >
          <span className="absolute inset-0 animate-pulse bg-white/25" />
        </div>
      </div>

      <ol className="mt-5 space-y-2">
        {stages.map((stage, index) => {
          const isComplete = index < stageIndex;
          const isCurrent = index === stageIndex;
          return (
            <li
              key={`${stage}-${index}`}
              className={`flex items-start gap-2 text-sm ${
                isCurrent
                  ? "font-semibold text-slate-900"
                  : isComplete
                    ? "text-slate-600"
                    : "text-slate-400"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : isCurrent
                      ? "bg-cyan-100 text-cyan-800"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {isComplete ? "✓" : isCurrent ? "→" : "·"}
              </span>
              <span>{stage}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
