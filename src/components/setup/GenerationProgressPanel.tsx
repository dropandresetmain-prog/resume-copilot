"use client";

import { generationProgressPercent } from "@/lib/generate/generation-progress";

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

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-5 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm font-medium text-slate-900">{title}</p>
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
        {stages.map((stage, index) => (
          <li
            key={`${stage}-${index}`}
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
