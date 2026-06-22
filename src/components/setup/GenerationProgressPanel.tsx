"use client";

import {
  GENERATION_PROGRESS_STAGES,
  generationProgressPercent,
} from "@/lib/generate/generation-progress";

type GenerationProgressPanelProps = {
  stageIndex: number;
  className?: string;
};

export function GenerationProgressPanel({
  stageIndex,
  className = "",
}: GenerationProgressPanelProps) {
  const percent = generationProgressPercent(stageIndex);
  const label =
    GENERATION_PROGRESS_STAGES[stageIndex] ?? GENERATION_PROGRESS_STAGES[0];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-5 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm font-medium text-slate-900">Generating tailored resume</p>
      <p className="mt-1 text-sm text-slate-600">
        {label}… This may take a moment while we tailor content from your inventory.
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="mt-4 space-y-1 text-xs text-slate-500">
        {GENERATION_PROGRESS_STAGES.map((stage, index) => (
          <li
            key={stage}
            className={
              index <= stageIndex ? "font-medium text-slate-700" : "text-slate-400"
            }
          >
            {index < stageIndex ? "✓ " : index === stageIndex ? "→ " : "· "}
            {stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
