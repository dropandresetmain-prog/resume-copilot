"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  applicationStatusBadgeClassName,
  formatApplicationLabel,
  formatApplicationStatusLabel,
} from "@/lib/application/labels";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import { formatApplicationArtifactSummary } from "@/lib/generate/generation-artifact-status";
import { formatDraftStatusLabel } from "@/lib/resume-draft/draft-labels";
import {
  archiveApplicationRecordInCloud,
  listApplicationRecordsFromCloud,
  updateApplicationRecordInCloud,
} from "@/lib/supabase/application-records";
import { listGeneratedCoverLetterDraftsFromCloud } from "@/lib/supabase/generated-cover-letter-drafts";
import { listGeneratedResumeDraftsFromCloud } from "@/lib/supabase/generated-resume-drafts";
import {
  APPLICATION_RECORD_STATUSES,
  EDITABLE_APPLICATION_RECORD_STATUSES,
  type ApplicationRecordStatus,
  type StoredApplicationRecord,
} from "@/types/application-record";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

import {
  EmptyState,
  destructiveActionGroupClassName,
  destructiveButtonClassName,
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";

type ApplicationRecordsPanelProps = {
  isSignedIn: boolean;
  jobDescriptions: StoredJobDescription[];
};

type ApplicationCardState = {
  notesDraft: string;
  isSavingNotes: boolean;
  isSavingStatus: boolean;
  isArchiving: boolean;
  expanded: boolean;
};

function buildLatestDraftByApplicationId(
  drafts: GeneratedResumeDraftRecord[],
): Map<string, GeneratedResumeDraftRecord> {
  const latest = new Map<string, GeneratedResumeDraftRecord>();

  for (const draft of drafts) {
    if (!draft.applicationId) {
      continue;
    }
    const current = latest.get(draft.applicationId);
    if (!current || new Date(draft.updatedAt) > new Date(current.updatedAt)) {
      latest.set(draft.applicationId, draft);
    }
  }

  return latest;
}

function buildLatestCoverLetterByApplicationId(
  coverLetters: GeneratedCoverLetterDraftRecord[],
): Map<string, GeneratedCoverLetterDraftRecord> {
  const latest = new Map<string, GeneratedCoverLetterDraftRecord>();
  for (const letter of coverLetters) {
    if (!letter.applicationId) {
      continue;
    }
    const current = latest.get(letter.applicationId);
    if (!current || new Date(letter.updatedAt) > new Date(current.updatedAt)) {
      latest.set(letter.applicationId, letter);
    }
  }
  return latest;
}

function buildStatusCounts(applications: StoredApplicationRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const application of applications) {
    counts[application.status] = (counts[application.status] ?? 0) + 1;
  }
  return counts;
}

export function ApplicationRecordsPanel({
  isSignedIn,
  jobDescriptions,
}: ApplicationRecordsPanelProps) {
  const [applications, setApplications] = useState<StoredApplicationRecord[]>([]);
  const [drafts, setDrafts] = useState<GeneratedResumeDraftRecord[]>([]);
  const [coverLetters, setCoverLetters] = useState<GeneratedCoverLetterDraftRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<Record<string, ApplicationCardState>>({});

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [applicationRows, draftRows, coverLetterRows] = await Promise.all([
          listApplicationRecordsFromCloud(),
          listGeneratedResumeDraftsFromCloud(),
          listGeneratedCoverLetterDraftsFromCloud(),
        ]);
        if (cancelled) {
          return;
        }
        setApplications(applicationRows);
        setDrafts(draftRows);
        setCoverLetters(coverLetterRows);
        setCardState(
          Object.fromEntries(
            applicationRows.map((record) => [
              record.id,
              {
                notesDraft: record.notes ?? "",
                isSavingNotes: false,
                isSavingStatus: false,
                isArchiving: false,
                expanded: false,
              },
            ]),
          ),
        );
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load application records.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const jobById = useMemo(
    () => new Map(jobDescriptions.map((job) => [job.id, job])),
    [jobDescriptions],
  );
  const latestDraftByApplicationId = useMemo(
    () => buildLatestDraftByApplicationId(drafts),
    [drafts],
  );
  const latestCoverLetterByApplicationId = useMemo(
    () => buildLatestCoverLetterByApplicationId(coverLetters),
    [coverLetters],
  );
  const statusCounts = useMemo(() => buildStatusCounts(applications), [applications]);
  const linkedDraftCount = useMemo(
    () => drafts.filter((draft) => Boolean(draft.applicationId)).length,
    [drafts],
  );
  const linkedCoverLetterCount = useMemo(
    () => coverLetters.filter((letter) => Boolean(letter.applicationId)).length,
    [coverLetters],
  );

  function updateCardState(
    applicationId: string,
    patch: Partial<ApplicationCardState>,
  ) {
    setCardState((current) => ({
      ...current,
      [applicationId]: {
        notesDraft: current[applicationId]?.notesDraft ?? "",
        isSavingNotes: current[applicationId]?.isSavingNotes ?? false,
        isSavingStatus: current[applicationId]?.isSavingStatus ?? false,
        isArchiving: current[applicationId]?.isArchiving ?? false,
        expanded: current[applicationId]?.expanded ?? false,
        ...patch,
      },
    }));
  }

  async function handleStatusChange(
    application: StoredApplicationRecord,
    status: ApplicationRecordStatus,
  ) {
    updateCardState(application.id, { isSavingStatus: true });
    setError(null);
    try {
      const updated = await updateApplicationRecordInCloud(application.id, { status });
      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update application status.",
      );
    } finally {
      updateCardState(application.id, { isSavingStatus: false });
    }
  }

  async function handleSaveNotes(application: StoredApplicationRecord) {
    const notesDraft = cardState[application.id]?.notesDraft ?? application.notes ?? "";
    updateCardState(application.id, { isSavingNotes: true });
    setError(null);
    try {
      const updated = await updateApplicationRecordInCloud(application.id, {
        notes: notesDraft,
      });
      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save application notes.",
      );
    } finally {
      updateCardState(application.id, { isSavingNotes: false });
    }
  }

  async function handleArchiveApplication(application: StoredApplicationRecord) {
    const label = formatApplicationLabel(
      application,
      application.jobDescriptionId
        ? jobById.get(application.jobDescriptionId)
        : undefined,
    );
    const confirmed = window.confirm(
      `Archive this application?\n\n${label}\n\nThis removes the application from the list. Linked resume and cover letter drafts are not deleted.`,
    );
    if (!confirmed) {
      return;
    }

    updateCardState(application.id, { isArchiving: true });
    setError(null);
    try {
      await archiveApplicationRecordInCloud(application.id);
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setCardState((current) => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive application.",
      );
    } finally {
      updateCardState(application.id, { isArchiving: false });
    }
  }

  return (
    <SetupCard
      title="Application workspace"
      description="Compact overview of each job — expand a row for notes, status edits, and artifact details."
      variant="primary"
    >
      {!isSignedIn ? (
        <p className="mt-3 text-sm text-slate-600">
          Sign in to see application records from Supabase.
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Generate a tailored resume on the Generate page to create your first application record."
        />
      ) : (
        <>
          <dl className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Applications
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
                {applications.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resume drafts
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
                {linkedDraftCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cover letters
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
                {linkedCoverLetterCount}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                By status
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {APPLICATION_RECORD_STATUSES.filter((status) => statusCounts[status]).map(
                  (status) => (
                    <span
                      key={status}
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${applicationStatusBadgeClassName(status)}`}
                    >
                      {formatApplicationStatusLabel(status)} {statusCounts[status]}
                    </span>
                  ),
                )}
              </dd>
            </div>
          </dl>

          <ul className="mt-4 space-y-2">
            {applications.map((application) => {
              const job = application.jobDescriptionId
                ? jobById.get(application.jobDescriptionId)
                : undefined;
              const label = formatApplicationLabel(application, job);
              const latestDraft = latestDraftByApplicationId.get(application.id);
              const latestCoverLetter = latestCoverLetterByApplicationId.get(application.id);
              const artifactSummary = formatApplicationArtifactSummary({
                hasResume: Boolean(latestDraft),
                hasCoverLetter: Boolean(latestCoverLetter),
              });
              const jobUrl = application.jobUrl ?? job?.jobUrl;
              const state = cardState[application.id] ?? {
                notesDraft: application.notes ?? "",
                isSavingNotes: false,
                isSavingStatus: false,
                isArchiving: false,
                expanded: false,
              };
              const updatedLabel = new Date(application.updatedAt).toLocaleString();
              const contextLabel = hasUsableCompanyContext(application.companyContext)
                ? application.companyContext?.sourceType === "website_research"
                  ? "website research"
                  : "JD-based"
                : "none";

              return (
                <li
                  key={application.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm"
                >
                  <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${applicationStatusBadgeClassName(application.status)}`}
                        >
                          {formatApplicationStatusLabel(application.status)}
                        </span>
                        <p className="truncate text-base font-semibold text-slate-950">{label}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Resume {artifactSummary.resumeLabel} · Cover letter{" "}
                        {artifactSummary.coverLetterLabel} · Research {contextLabel} · Updated{" "}
                        {updatedLabel}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {latestDraft ? (
                        <Link
                          href={`/resume-preview/${latestDraft.id}`}
                          className={`${primaryButtonClassName} min-h-9 px-4 py-2 text-sm`}
                        >
                          Open package
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          updateCardState(application.id, { expanded: !state.expanded })
                        }
                        className={secondaryButtonClassName}
                        aria-expanded={state.expanded}
                      >
                        {state.expanded ? "Hide details" : "Details"}
                      </button>
                    </div>
                  </div>

                  {state.expanded ? (
                    <div className="space-y-4 border-t border-slate-200 bg-slate-50/60 px-4 py-4">
                      {jobUrl ? (
                        <p className="text-xs text-slate-600">
                          <a
                            href={jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-700 underline"
                          >
                            Job posting
                          </a>
                        </p>
                      ) : null}

                      {application.jobDescriptionId ? (
                        <p>
                          <Link
                            href={`/generate?jobId=${application.jobDescriptionId}`}
                            className="text-xs font-medium text-blue-700 underline"
                          >
                            Edit company research on Generate page
                          </Link>
                        </p>
                      ) : null}

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`application-status-${application.id}`}
                            className={labelClassName}
                          >
                            Status
                          </label>
                          <select
                            id={`application-status-${application.id}`}
                            value={application.status}
                            disabled={state.isSavingStatus}
                            onChange={(event) =>
                              void handleStatusChange(
                                application,
                                event.target.value as ApplicationRecordStatus,
                              )
                            }
                            className={formFieldClassName}
                          >
                            {EDITABLE_APPLICATION_RECORD_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {formatApplicationStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                          {state.isSavingStatus ? (
                            <p className="mt-1 text-xs text-slate-500">Saving…</p>
                          ) : null}
                        </div>

                        <div>
                          <p className={labelClassName}>Latest artifacts</p>
                          {latestDraft ? (
                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                              <p className="text-sm text-slate-800">
                                {formatDraftStatusLabel(latestDraft.status)}
                                {latestDraft.modelName ? ` · ${latestDraft.modelName}` : ""}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Updated {new Date(latestDraft.updatedAt).toLocaleString()}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Link
                                  href={`/resume-preview/${latestDraft.id}`}
                                  className={secondaryButtonClassName}
                                >
                                  Open draft
                                </Link>
                                {latestCoverLetter ? (
                                  <Link
                                    href={`/cover-letter-preview/${latestCoverLetter.id}`}
                                    className={secondaryButtonClassName}
                                  >
                                    Edit cover letter
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">No linked draft yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label
                          htmlFor={`application-notes-${application.id}`}
                          className={labelClassName}
                        >
                          Notes
                        </label>
                        <textarea
                          id={`application-notes-${application.id}`}
                          value={state.notesDraft}
                          onChange={(event) =>
                            updateCardState(application.id, { notesDraft: event.target.value })
                          }
                          rows={3}
                          className={formFieldClassName}
                          placeholder="Interview prep, recruiter contact, follow-up reminders…"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveNotes(application)}
                          disabled={state.isSavingNotes}
                          className={`mt-2 w-full sm:w-auto ${secondaryButtonClassName}`}
                        >
                          {state.isSavingNotes ? "Saving notes…" : "Save notes"}
                        </button>
                      </div>

                      <div className={destructiveActionGroupClassName}>
                        <p className="text-xs text-slate-600">
                          Archive removes this application from the list. Linked drafts and company
                          context are kept.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleArchiveApplication(application)}
                          disabled={state.isArchiving}
                          className={`w-full sm:w-auto ${destructiveButtonClassName}`}
                        >
                          {state.isArchiving ? "Archiving…" : "Archive application"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SetupCard>
  );
}
