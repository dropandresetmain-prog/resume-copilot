"use client";

import {
  primaryButtonClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import type { PackageFixMode } from "@/lib/package/fix-mode";

type PackageDecisionTreeProps = {
  exportReady: boolean;
  hasCoverLetter: boolean;
  onSelectMode: (mode: PackageFixMode) => void;
  onScrollToApprove: () => void;
};

export function PackageDecisionTree({
  exportReady,
  hasCoverLetter,
  onSelectMode,
  onScrollToApprove,
}: PackageDecisionTreeProps) {
  return (
    <div
      className="rounded-lg border border-cyan-100 bg-cyan-50/50 px-4 py-3"
      data-testid="package-decision-tree"
    >
      <p className="text-xs font-semibold uppercase text-cyan-900">Review workflow</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-800">
        <li>
          <span className="font-medium">Good enough?</span> Approve for export, then download PDF or
          DOCX.
        </li>
        <li>
          <span className="font-medium">Resume needs work?</span> Open a fix mode below — then
          re-approve.
        </li>
        <li>
          <span className="font-medium">Cover letter needs work?</span> Stage revision instructions,
          revise once, preview, then accept or reject.
        </li>
      </ol>
      <div className={`${secondaryActionGroupClassName} mt-3`} data-testid="package-decision-actions">
        <button
          type="button"
          className={secondaryButtonClassName}
          data-action="edit-resume-text"
          onClick={() => onSelectMode("edit-resume")}
        >
          Edit resume text
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          data-action="custom-resume-revision-queue"
          onClick={() => onSelectMode("edit-resume")}
        >
          Custom resume revision queue
        </button>
        <p
          className="w-full basis-full text-xs text-slate-600"
          data-testid="package-custom-revision-queue-copy"
        >
          Stage summary/role instructions and revise once — opens resume text edit mode.
        </p>
        <button
          type="button"
          className={secondaryButtonClassName}
          data-action="fix-resume-evidence"
          onClick={() => onSelectMode("fix-evidence")}
        >
          Fix resume evidence
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          data-action="adjust-resume-layout"
          onClick={() => onSelectMode("adjust-layout")}
        >
          Adjust resume layout
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          data-action="revise-cover-letter"
          onClick={() => onSelectMode("revise-cover-letter")}
          disabled={!hasCoverLetter}
        >
          Revise cover letter
        </button>
        <button
          type="button"
          className={exportReady ? secondaryButtonClassName : primaryButtonClassName}
          data-action="approve-for-export-link"
          onClick={onScrollToApprove}
        >
          Approve for export
        </button>
      </div>
    </div>
  );
}
