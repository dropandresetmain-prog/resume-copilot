"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  actionBarClassName,
  primaryActionGroupClassName,
  primaryButtonClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import type {
  ApplicationReviewOverallStatus,
  ApplicationReviewStatus,
  ReviewItem,
} from "@/lib/application-review/build-application-review-status";

type ApplicationReviewCenterProps = {
  companyName?: string;
  roleTitle?: string;
  reviewStatus: ApplicationReviewStatus;
  resumeDraftId: string;
  coverLetterId?: string;
  onApproveForExport: () => void;
  isApproving: boolean;
  canApprove: boolean;
  approveButtonLabel: string;
  exportControls?: ReactNode;
  /** Whether the draft is currently approved and export-ready — controls Approve→Export sequencing. */
  exportReady: boolean;
};

const OVERALL_LABELS: Record<ApplicationReviewOverallStatus, string> = {
  READY_TO_EXPORT: "Ready to Export",
  REVIEW_RECOMMENDED: "Review Recommended",
  NOT_READY_TO_EXPORT: "Not Ready to Export",
  DRAFT_READY: "Draft ready — approve to export",
};

const OVERALL_ICONS: Record<ApplicationReviewOverallStatus, string> = {
  READY_TO_EXPORT: "✓",
  REVIEW_RECOMMENDED: "⚠",
  NOT_READY_TO_EXPORT: "✗",
  DRAFT_READY: "→",
};

const OVERALL_STYLES: Record<ApplicationReviewOverallStatus, string> = {
  READY_TO_EXPORT: "border-emerald-200 bg-emerald-50 text-emerald-950",
  REVIEW_RECOMMENDED: "border-amber-200 bg-amber-50 text-amber-950",
  NOT_READY_TO_EXPORT: "border-red-200 bg-red-50 text-red-950",
  DRAFT_READY: "border-cyan-200 bg-cyan-50 text-cyan-950",
};

function ReviewItemRow({ item }: { item: ReviewItem }) {
  const prefix =
    item.severity === "blocking" ? "✗" : item.severity === "warning" ? "⚠" : "·";
  const className =
    item.severity === "blocking"
      ? "text-red-800"
      : item.severity === "warning"
        ? "text-amber-900"
        : "text-slate-700";

  return (
    <li className={`text-sm ${className}`}>
      <span className="mr-2 font-medium">{prefix}</span>
      {item.message}
    </li>
  );
}

function ReviewSection({
  sectionId,
  label,
  items,
  blockingCount,
  warningCount,
  defaultExpanded,
}: {
  sectionId: string;
  label: string;
  items: ReviewItem[];
  blockingCount: number;
  warningCount: number;
  defaultExpanded: boolean;
}) {
  const summaryParts: string[] = [];
  if (blockingCount > 0) {
    summaryParts.push(`${blockingCount} blocking`);
  }
  if (warningCount > 0) {
    summaryParts.push(`${warningCount} warning${warningCount === 1 ? "" : "s"}`);
  }
  if (summaryParts.length === 0) {
    summaryParts.push("OK");
  }

  return (
    <details
      className="rounded-lg border border-slate-200 bg-white"
      data-section={sectionId}
      open={defaultExpanded}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900">
        {label}
        <span className="ml-2 font-normal text-slate-500">— {summaryParts.join(" · ")}</span>
      </summary>
      {items.length > 0 ? (
        <ul className="space-y-2 border-t border-slate-100 px-4 py-3">
          {items.map((item) => (
            <ReviewItemRow key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">No items.</p>
      )}
    </details>
  );
}

export function ApplicationReviewCenter({
  companyName,
  roleTitle,
  reviewStatus,
  resumeDraftId,
  coverLetterId,
  onApproveForExport,
  isApproving,
  canApprove,
  approveButtonLabel,
  exportControls,
  exportReady,
}: ApplicationReviewCenterProps) {
  const displayTitle =
    companyName && roleTitle
      ? `${roleTitle} @ ${companyName}`
      : companyName || roleTitle || "Application";

  const { overallStatus, blockingCount, warningCount, sections } = reviewStatus;

  const reviewItemCount = blockingCount + warningCount;
  const reviewSummary =
    reviewItemCount === 0
      ? "No issues"
      : [
          blockingCount > 0 ? `${blockingCount} blocking` : "",
          warningCount > 0 ? `${warningCount} warning${warningCount === 1 ? "" : "s"}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div
      className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-md sm:p-5"
      data-testid="application-review-center"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-800">
            Application Review
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{displayTitle}</h2>
        </div>
      </div>

      <div
        className={`mt-4 rounded-lg border px-4 py-3 ${OVERALL_STYLES[overallStatus]}`}
        data-testid="application-review-overall"
      >
        <p className="text-sm font-semibold">
          {OVERALL_ICONS[overallStatus]} {OVERALL_LABELS[overallStatus]}
        </p>
        {overallStatus === "DRAFT_READY" ? (
          <p className="mt-1 text-sm">
            Review the resume below, then approve for export.
          </p>
        ) : (
          <p className="mt-1 text-sm">
            {blockingCount > 0
              ? `${blockingCount} blocking item${blockingCount === 1 ? "" : "s"}`
              : "No blocking items"}
            {warningCount > 0
              ? ` · ${warningCount} warning${warningCount === 1 ? "" : "s"}`
              : ""}
          </p>
        )}
      </div>

      {/* Approve → Export two-step sequence */}
      <div className={`mt-4 ${actionBarClassName}`} data-section="resume-approve-export">
        {exportReady ? (
          /* Step 2 active: export is the primary action */
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-800">
                Export
              </p>
              <div className={`${primaryActionGroupClassName} mt-2`}>{exportControls}</div>
            </div>
            <div>
              <button
                type="button"
                onClick={onApproveForExport}
                disabled={isApproving || !canApprove}
                className={`${secondaryButtonClassName} mt-1`}
                data-action="review-approve-export"
              >
                {approveButtonLabel}
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Re-approve if you change layout settings after approval.
              </p>
            </div>
          </div>
        ) : (
          /* Step 1: Approve is the primary action, export is inert with hint */
          <div className="grid gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-800">
                Step 1 — Approve
              </p>
              <button
                type="button"
                onClick={onApproveForExport}
                disabled={isApproving || !canApprove}
                className={`${primaryButtonClassName} mt-2 w-full`}
                data-action="review-approve-export"
              >
                {approveButtonLabel}
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Step 2 — Export (after approval)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Approve first to enable export.
              </p>
              <div className={`${primaryActionGroupClassName} mt-2`}>{exportControls}</div>
            </div>
          </div>
        )}
      </div>

      {/* Edit and research secondary links */}
      <div className={`mt-4 ${secondaryActionGroupClassName}`}>
        <p className="text-xs font-semibold uppercase text-slate-500 sm:w-full">
          Edit and research
        </p>
        <Link
          href={`/resume-preview/${resumeDraftId}/edit`}
          className={secondaryButtonClassName}
        >
          Edit resume
        </Link>
        {coverLetterId ? (
          <Link
            href={`/cover-letter-preview/${coverLetterId}`}
            className={secondaryButtonClassName}
          >
            Edit cover letter
          </Link>
        ) : (
          <a href="#package-cover-letter" className={secondaryButtonClassName}>
            Go to cover letter
          </a>
        )}
      </div>

      {/* Review details collapsed by default — checklists are secondary to the action */}
      <details
        className="mt-4 rounded-lg border border-slate-200"
        data-section="review-details-disclosure"
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
          Review details
          <span className="ml-2 font-normal text-slate-500">— {reviewSummary}</span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-3">
          {sections
            .filter((section) => section.id !== "generation")
            .map((section) => (
              <ReviewSection
                key={section.id}
                sectionId={section.id}
                label={section.label}
                items={section.items}
                blockingCount={section.blockingCount}
                warningCount={section.warningCount}
                defaultExpanded={section.defaultExpanded}
              />
            ))}

          <details
            className="rounded-lg border border-slate-200 bg-slate-50"
            data-section="generation"
          >
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
              Generation details
            </summary>
            <ul className="space-y-2 border-t border-slate-200 px-4 py-3">
              {(sections.find((section) => section.id === "generation")?.items ?? []).map(
                (item) => (
                  <ReviewItemRow key={item.id} item={item} />
                ),
              )}
            </ul>
          </details>
        </div>
      </details>
    </div>
  );
}
