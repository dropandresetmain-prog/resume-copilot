import type { ModelTier } from "@/lib/ai/model-tiers";

type ModelSelectionDebugProps = {
  requestedTier?: ModelTier | null;
  actualModel?: string | null;
  fallbackApplied?: boolean;
  className?: string;
};

export function ModelSelectionDebug({
  requestedTier,
  actualModel,
  fallbackApplied = false,
  className = "mt-2 text-xs text-slate-500",
}: ModelSelectionDebugProps) {
  if (!requestedTier && !actualModel) {
    return null;
  }

  return (
    <p className={className}>
      {requestedTier ? (
        <>
          Requested tier: <span className="font-medium capitalize">{requestedTier}</span>
        </>
      ) : null}
      {actualModel ? (
        <>
          {requestedTier ? " · " : null}
          Actual model: <span className="font-mono">{actualModel}</span>
        </>
      ) : null}
      {fallbackApplied ? (
        <>
          {" · "}
          <span className="text-amber-700">Fallback applied</span>
        </>
      ) : null}
    </p>
  );
}
