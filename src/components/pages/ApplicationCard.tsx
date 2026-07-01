import Link from "next/link";

import { CompanyAvatar, statusBadgeClass } from "@/components/pages/ApplicationsPageClient";
import { formatApplicationStatusLabel } from "@/lib/application/labels";
import {
  EDITABLE_APPLICATION_RECORD_STATUSES,
  type ApplicationRecordStatus,
  type StoredApplicationRecord,
} from "@/types/application-record";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";
import type { StoredJobDescription } from "@/types/jd";

// Shared between the desktop table's expanded row and the mobile card's
// expanded section, so the (status / artifacts / notes / saved job) form only
// exists once.
export type ApplicationDetailsProps = {
  app: StoredApplicationRecord;
  latestDraft?: GeneratedResumeDraftRecord;
  latestCoverLetter?: GeneratedCoverLetterDraftRecord;
  jobDescription?: StoredJobDescription;
  notesDraft: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
  onStatusChange: (status: ApplicationRecordStatus) => void;
  savingStatus: boolean;
};

export function ApplicationDetails({
  app,
  latestDraft,
  latestCoverLetter,
  jobDescription,
  notesDraft,
  onNotesChange,
  onSaveNotes,
  savingNotes,
  onStatusChange,
  savingStatus,
}: ApplicationDetailsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="app-details">
      {/* Status select */}
      <div>
        <label
          htmlFor={`status-${app.id}`}
          className="mb-1 block text-xs font-semibold text-folio-outline"
        >
          Status
        </label>
        <select
          id={`status-${app.id}`}
          value={app.status}
          disabled={savingStatus}
          onChange={(e) => onStatusChange(e.target.value as ApplicationRecordStatus)}
          data-testid="status-select"
          className="w-full rounded-lg border border-folio-outline-variant bg-white px-3 py-2 text-sm text-folio-on-surface focus:border-folio-primary focus:outline-none"
        >
          {EDITABLE_APPLICATION_RECORD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {formatApplicationStatusLabel(s)}
            </option>
          ))}
        </select>
        {savingStatus ? <p className="mt-1 text-xs text-folio-outline">Saving…</p> : null}
      </div>

      {/* Artifact links */}
      <div>
        <p className="mb-1 text-xs font-semibold text-folio-outline">Artifacts</p>
        <div className="space-y-1 text-sm">
          {latestDraft ? (
            <div className="flex items-center gap-2">
              <span className="text-[#016147]">✓</span>
              <Link
                href={`/output/${latestDraft.id}`}
                className="text-folio-primary underline underline-offset-2"
                data-testid="resume-draft-link"
              >
                Resume draft
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-folio-outline">
              <span>—</span>
              <span>No resume draft yet</span>
            </div>
          )}
          {latestCoverLetter ? (
            <div className="flex items-center gap-2">
              <span className="text-[#016147]">✓</span>
              {latestDraft ? (
                <Link
                  href={`/output/${latestDraft.id}`}
                  className="text-folio-primary underline underline-offset-2"
                  data-testid="cover-letter-link"
                >
                  Cover letter
                </Link>
              ) : (
                <span>Cover letter</span>
              )}
            </div>
          ) : latestDraft ? (
            <div className="flex items-center gap-2 text-folio-outline">
              <span>✗</span>
              <span>No cover letter yet</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notes */}
      <div className="sm:col-span-2">
        <label
          htmlFor={`notes-${app.id}`}
          className="mb-1 block text-xs font-semibold text-folio-outline"
        >
          Notes
        </label>
        <textarea
          id={`notes-${app.id}`}
          value={notesDraft}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          data-testid="notes-textarea"
          placeholder="Interview prep, recruiter contact, follow-up reminders…"
          className="w-full rounded-lg border border-folio-outline-variant bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={onSaveNotes}
          disabled={savingNotes}
          data-testid="save-notes-button"
          className="mt-2 rounded-lg border border-folio-outline-variant px-4 py-1.5 text-sm text-folio-on-surface transition hover:bg-folio-surface-container disabled:opacity-40"
        >
          {savingNotes ? "Saving…" : "Save notes"}
        </button>
      </div>

      {/* Saved job link */}
      {jobDescription ? (
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-semibold text-folio-outline">Saved job</p>
          <div className="rounded-lg border border-folio-outline-variant bg-white px-3 py-2 text-sm">
            <p className="text-folio-on-surface-variant line-clamp-2">
              {jobDescription.summary ?? jobDescription.rawText.slice(0, 200)}
            </p>
            <Link
              href={`/generate?jobId=${app.jobDescriptionId}`}
              className="mt-2 inline-block text-xs text-folio-primary underline underline-offset-2"
              data-testid="saved-job-generate-link"
            >
              Re-use this job on Generate →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type ApplicationCardProps = {
  app: StoredApplicationRecord;
  company: string;
  role: string;
  dateAdded: string;
  latestDraft?: GeneratedResumeDraftRecord;
  latestCoverLetter?: GeneratedCoverLetterDraftRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onArchive: () => void;
  archiving: boolean;
  detailsProps: ApplicationDetailsProps;
};

// Mobile (<md) stand-in for a table row — same data and actions, stacked
// instead of packed into columns, with ~44px touch targets on the actions.
export function ApplicationCard({
  app,
  company,
  role,
  dateAdded,
  latestDraft,
  latestCoverLetter,
  isExpanded,
  onToggleExpand,
  onArchive,
  archiving,
  detailsProps,
}: ApplicationCardProps) {
  return (
    <div
      className="rounded-xl border border-folio-sage-border bg-white p-4"
      data-testid="application-card"
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar name={company} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-folio-on-surface">{company}</p>
          <p className="truncate text-sm text-folio-on-surface-variant">{role}</p>
          <p className="mt-0.5 text-xs text-folio-outline">{dateAdded}</p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(app.status)}`}
        >
          {formatApplicationStatusLabel(app.status)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-folio-outline">
        <span className="flex items-center gap-1">
          {latestDraft ? (
            <span className="font-semibold text-[#016147]">✓</span>
          ) : (
            <span className="text-folio-outline-variant">—</span>
          )}
          Resume
        </span>
        <span className="flex items-center gap-1">
          {latestCoverLetter ? (
            <span className="font-semibold text-[#016147]">✓</span>
          ) : (
            <span className="text-folio-outline-variant">—</span>
          )}
          Cover letter
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-folio-surface-container pt-3">
        {latestDraft ? (
          <Link
            href={`/output/${latestDraft.id}`}
            className="flex h-11 flex-1 items-center justify-center rounded-lg border border-folio-outline-variant text-sm text-folio-on-surface transition hover:bg-folio-surface-container"
            data-testid="open-package-link-card"
          >
            View package
          </Link>
        ) : (
          <span className="flex h-11 flex-1 items-center justify-center text-sm text-folio-outline-variant">
            No draft yet
          </span>
        )}
        <button
          type="button"
          title={isExpanded ? "Hide details" : "Details"}
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-folio-outline-variant text-folio-outline transition hover:bg-folio-surface-container"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden="true"
            style={{ transform: isExpanded ? "rotate(180deg)" : undefined }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          type="button"
          title="Archive"
          disabled={archiving}
          onClick={onArchive}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-folio-outline-variant text-folio-outline transition hover:bg-folio-surface-container disabled:opacity-40"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-3 border-t border-folio-surface-container pt-3">
          <ApplicationDetails {...detailsProps} />
        </div>
      ) : null}
    </div>
  );
}
