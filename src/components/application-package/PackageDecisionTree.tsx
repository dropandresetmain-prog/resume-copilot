"use client";

import Link from "next/link";

import {
  primaryButtonClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";

type PackageDecisionTreeProps = {
  resumeDraftId: string;
  coverLetterId?: string;
  exportReady: boolean;
};

export function PackageDecisionTree({
  resumeDraftId,
  coverLetterId,
  exportReady,
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
          <span className="font-medium">Resume needs work?</span> Edit text, fix evidence, or adjust
          layout — then re-approve.
        </li>
        <li>
          <span className="font-medium">Cover letter needs work?</span> Stage revision instructions,
          revise once, preview, then accept or reject.
        </li>
      </ol>
      <div className={`${secondaryActionGroupClassName} mt-3`} data-testid="package-decision-actions">
        <Link
          href={`/resume-preview/${resumeDraftId}#package-resume-edit`}
          className={secondaryButtonClassName}
          data-action="edit-resume-text"
        >
          Edit resume text
        </Link>
        <a href={`/resume-preview/${resumeDraftId}#package-edit`} className={secondaryButtonClassName}>
          Fix resume evidence
        </a>
        <a
          href={`/resume-preview/${resumeDraftId}#package-layout-controls`}
          className={secondaryButtonClassName}
        >
          Adjust resume layout
        </a>
        {coverLetterId ? (
          <a
            href={`/resume-preview/${resumeDraftId}#package-cover-letter-revision`}
            className={secondaryButtonClassName}
          >
            Revise cover letter
          </a>
        ) : (
          <a href="#package-cover-letter" className={secondaryButtonClassName}>
            Revise cover letter
          </a>
        )}
        <a
          href={`/resume-preview/${resumeDraftId}#package-approve`}
          className={exportReady ? secondaryButtonClassName : primaryButtonClassName}
          data-action="approve-for-export-link"
        >
          Approve for export
        </a>
      </div>
    </div>
  );
}
