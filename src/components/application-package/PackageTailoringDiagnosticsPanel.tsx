"use client";

import Link from "next/link";

import { secondaryButtonClassName } from "@/components/setup/ui";
import type { PackageFixMode } from "@/lib/package/fix-mode";
import type {
  CoverLetterProofStatus,
  PackageTailoringDiagnostics,
  TailoringDiagnosticLine,
} from "@/lib/package/tailoring-diagnostics";

type PackageTailoringDiagnosticsPanelProps = {
  diagnostics: PackageTailoringDiagnostics;
  coverLetterId?: string;
  onFixAction?: (mode: PackageFixMode) => void;
  onScrollToApprove?: () => void;
};

function lineClassName(severity: TailoringDiagnosticLine["severity"]): string {
  if (severity === "strength") {
    return "text-emerald-900";
  }
  if (severity === "warning") {
    return "text-amber-900";
  }
  return "text-slate-700";
}

function DiagnosticSection({
  title,
  note,
  lines,
  emptyMessage,
  testId,
}: {
  title: string;
  note?: string;
  lines: TailoringDiagnosticLine[];
  emptyMessage?: string;
  testId: string;
}) {
  return (
    <section data-testid={testId}>
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      {note ? <p className="mt-0.5 text-xs text-slate-500">{note}</p> : null}
      {lines.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {lines.map((line) => (
            <li key={line.id} className={`text-sm ${lineClassName(line.severity)}`}>
              {line.message}
            </li>
          ))}
        </ul>
      ) : emptyMessage ? (
        <p className="mt-1.5 text-sm text-slate-600" data-testid={`${testId}-empty`}>
          {emptyMessage}
        </p>
      ) : null}
    </section>
  );
}

function coverLetterProofEmptyMessage(status: CoverLetterProofStatus): string | undefined {
  switch (status) {
    case "no-cover-letter":
      return "No cover letter yet — generate one below to compare proof stories.";
    case "needs-inventory":
      return "Saved cover letter present — inventory unavailable here for live proof comparison.";
    case "saved-only":
      return undefined;
    case "full":
      return "No off-resume proof stories ranked for this letter.";
    default:
      return undefined;
  }
}

export function PackageTailoringDiagnosticsPanel({
  diagnostics,
  coverLetterId,
  onFixAction,
  onScrollToApprove,
}: PackageTailoringDiagnosticsPanelProps) {
  if (!diagnostics.available) {
    return null;
  }

  const selectedEmpty = diagnostics.hasEvidenceSpine
    ? "No ranked selections in the saved spine snapshot."
    : "Legacy draft — saved rationale only; regenerate for a full evidence spine.";

  const omittedEmpty = diagnostics.hasEvidenceSpine
    ? "No high-score optional evidence flagged — one-page fit may still leave inventory unused."
    : "Legacy draft — check generation notes or Fix resume evidence for ranked options.";

  const showCoverLetterSection = diagnostics.coverLetterProofStatus !== "no-cover-letter";
  const coverLetterEmpty = coverLetterProofEmptyMessage(diagnostics.coverLetterProofStatus);

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
        <DiagnosticSection
          title="Strongest evidence selected"
          lines={diagnostics.selectedEvidence}
          emptyMessage={selectedEmpty}
          testId="tailoring-selected-evidence"
        />
        <DiagnosticSection
          title="Strong evidence omitted"
          note="Advisory only — not a defect. One-page fit and JD focus often leave strong inventory unused."
          lines={diagnostics.omittedEvidence}
          emptyMessage={omittedEmpty}
          testId="tailoring-omitted-evidence"
        />
        {showCoverLetterSection ? (
          <DiagnosticSection
            title="Cover letter proof"
            lines={diagnostics.coverLetterProof}
            emptyMessage={coverLetterEmpty}
            testId="tailoring-cover-letter-proof"
          />
        ) : null}
        <DiagnosticSection
          title="Tailoring warnings"
          note="Style and rationale checks — advisory unless export is blocked elsewhere."
          lines={diagnostics.warnings}
          emptyMessage="No tailoring warnings detected."
          testId="tailoring-warnings"
        />
      </div>

      {diagnostics.suggestedActions.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3" data-testid="tailoring-next-actions">
          <p className="text-xs font-semibold uppercase text-slate-500">Next actions</p>
          <ul className="mt-2 space-y-2">
            {diagnostics.suggestedActions.map((action) => (
              <li key={action.id} className="text-sm text-slate-700">
                {action.id === "fix-resume-evidence" ? (
                  onFixAction ? (
                    <button
                      type="button"
                      className={`${secondaryButtonClassName} mr-2`}
                      data-action="tailoring-fix-resume-evidence"
                      onClick={() => onFixAction("fix-evidence")}
                    >
                      {action.label}
                    </button>
                  ) : (
                    <span className="mr-2 font-medium text-slate-800">{action.label}</span>
                  )
                ) : action.id === "edit-cover-letter-evidence" ? (
                  coverLetterId ? (
                    <Link
                      href={`/cover-letter-preview/${coverLetterId}`}
                      className={`${secondaryButtonClassName} mr-2 inline-flex`}
                      data-action="tailoring-edit-cover-letter-evidence"
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <span className="mr-2 font-medium text-slate-800">{action.label}</span>
                  )
                ) : action.id === "accept-risk" && onScrollToApprove ? (
                  <button
                    type="button"
                    className={`${secondaryButtonClassName} mr-2`}
                    data-action="tailoring-accept-risk"
                    onClick={onScrollToApprove}
                  >
                    {action.label}
                  </button>
                ) : (
                  <span className="mr-2 font-medium text-slate-800">{action.label}</span>
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
