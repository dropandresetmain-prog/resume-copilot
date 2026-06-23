import type { ParseFailure } from "@/types/resume";

type SetupAlertsProps = {
  persistenceWarning: string | null;
  importError: string | null;
  failures: ParseFailure[];
  warnings: { filename: string; messages: string[] }[];
  /** Collapse persistent storage notice — reduces alert fatigue on composer pages. */
  persistenceCollapsible?: boolean;
  /** Quieter borders/backgrounds for non-blocking notices. */
  compact?: boolean;
};

export function SetupAlerts({
  persistenceWarning,
  importError,
  failures,
  warnings,
  persistenceCollapsible = false,
  compact = false,
}: SetupAlertsProps) {
  const hasContent =
    persistenceWarning ||
    importError ||
    failures.length > 0 ||
    warnings.length > 0;

  if (!hasContent) return null;

  const persistenceClassName = compact
    ? "rounded-lg border border-amber-100 bg-amber-50/50 text-sm text-amber-900"
    : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900";

  return (
    <section className={compact ? "space-y-2" : "space-y-3"}>
      {persistenceWarning &&
        (persistenceCollapsible ? (
          <details className={persistenceClassName}>
            <summary className="cursor-pointer list-none px-3 py-2 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              Local data needs sync
            </summary>
            <p className="border-t border-amber-100/80 px-3 py-2 text-amber-800">
              {persistenceWarning}
            </p>
          </details>
        ) : (
          <div role="alert" className={persistenceClassName}>
            <p className={compact ? "px-3 py-2 font-medium" : "font-medium"}>
              Storage warning
            </p>
            <p className={compact ? "px-3 pb-2 text-amber-800" : "mt-1"}>
              {persistenceWarning}
            </p>
          </div>
        ))}

      {importError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-medium">Import error</p>
          <p className="mt-1">{importError}</p>
        </div>
      )}

      {failures.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-medium">Parsing errors</p>
          <ul className="mt-2 space-y-1">
            {failures.map((failure) => (
              <li key={`${failure.filename}-${failure.message}`}>
                <span className="font-medium">{failure.filename}:</span>{" "}
                {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div
          role="status"
          className={
            compact
              ? "rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-amber-900"
              : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          }
        >
          <p className="font-medium">Parsing warnings</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((entry) =>
              entry.messages.map((message) => (
                <li key={`${entry.filename}-${message}`}>
                  <span className="font-medium">{entry.filename}:</span> {message}
                </li>
              )),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
