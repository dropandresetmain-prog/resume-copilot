"use client";

import Link from "next/link";

import { secondaryButtonClassName } from "@/components/setup/ui";
import type { PackageFixMode } from "@/lib/package/fix-mode";
import type { PackageTailoringDiagnostics } from "@/lib/package/tailoring-diagnostics";

type PackageTailoringDiagnosticsPanelProps = {
  diagnostics: PackageTailoringDiagnostics;
  coverLetterId?: string;
  onFixAction?: (mode: PackageFixMode) => void;
};

function DiagnosticList({
  title,
  lines,
  testId,
}: {
  title: string;
  lines: PackageTailoringDiagnostics["selectedEvidence"];
  testId: string;
}) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <section data-testid={testId}>
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {lines.map((line) => (
          <li
            key={line.id}
            className={`text-sm ${
              line.severity === "strength"
                ? "text-emerald-900"
                : line.severity === "warning"
                  ? "text-amber-900"
                  : "text-slate-700"
            }`}
          >
            {line.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PackageTailoringDiagnosticsPanel({
  diagnostics,
  coverLetterId,
  onFixAction,
}: PackageTailoringDiagnosticsPanelProps) {
  if (!diagnostics.available) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="package-tailoring-diagnostics"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Evidence tailoring
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Deterministic read from saved generation output — no AI on page load.
      </p>

      <div className="mt-3 space-y-3">
        <DiagnosticList
          title="Strongest evidence selected"
          lines={diagnostics.selectedEvidence}
          testId="tailoring-selected-evidence"
        />
        <DiagnosticList
          title="Strong evidence omitted"
          lines={diagnostics.omittedEvidence}
          testId="tailoring-omitted-evidence"
        />
        <DiagnosticList
          title="Cover letter proof"
          lines={diagnostics.coverLetterProof}
          testId="tailoring-cover-letter-proof"
        />
        <DiagnosticList
          title="Tailoring warnings"
          lines={diagnostics.warnings}
          testId="tailoring-warnings"
        />
      </div>

      {diagnostics.suggestedActions.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3" data-testid="tailoring-next-actions">
          <p className="text-xs font-semibold uppercase text-slate-500">Next actions</p>
          <ul className="mt-2 space-y-2">
            {diagnostics.suggestedActions.map((action) => (
              <li key={action.id} className="text-sm text-slate-700">
                {action.id === "fix-resume-evidence" && onFixAction ? (
                  <button
                    type="button"
                    className={`${secondaryButtonClassName} mr-2`}
                    data-action="tailoring-fix-resume-evidence"
                    onClick={() => onFixAction("fix-evidence")}
                  >
                    {action.label}
                  </button>
                ) : action.id === "edit-cover-letter-evidence" && coverLetterId ? (
                  <Link
                    href={`/cover-letter-preview/${coverLetterId}`}
                    className={`${secondaryButtonClassName} mr-2 inline-flex`}
                    data-action="tailoring-edit-cover-letter-evidence"
                  >
                    {action.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-800">{action.label}</span>
                )}
                <span className="text-xs text-slate-500">{action.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
