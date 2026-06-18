import type { ParseFailure } from "@/types/resume";

type SetupAlertsProps = {
  persistenceWarning: string | null;
  importError: string | null;
  failures: ParseFailure[];
  warnings: { filename: string; messages: string[] }[];
};

export function SetupAlerts({
  persistenceWarning,
  importError,
  failures,
  warnings,
}: SetupAlertsProps) {
  const hasContent =
    persistenceWarning ||
    importError ||
    failures.length > 0 ||
    warnings.length > 0;

  if (!hasContent) return null;

  return (
    <section className="space-y-3">
      {persistenceWarning && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">Storage warning</p>
          <p className="mt-1">{persistenceWarning}</p>
        </div>
      )}

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
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
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
