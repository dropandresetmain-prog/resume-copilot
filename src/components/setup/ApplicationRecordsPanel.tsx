"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatApplicationLabel,
  formatApplicationStatusLabel,
} from "@/lib/application/labels";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import { formatApplicationArtifactSummary } from "@/lib/generate/generation-artifact-status";
import { formatDraftStatusLabel } from "@/lib/resume-draft/draft-labels";
import {
  listApplicationRecordsFromCloud,
  updateApplicationRecordInCloud,
} from "@/lib/supabase/application-records";
import { listGeneratedCoverLetterDraftsFromCloud } from "@/lib/supabase/generated-cover-letter-drafts";
import { listGeneratedResumeDraftsFromCloud } from "@/lib/supabase/generated-resume-drafts";
import {
  APPLICATION_RECORD_STATUSES,
  type ApplicationRecordStatus,
  type StoredApplicationRecord,
} from "@/types/application-record";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

import {
  EmptyState,
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

  return (
    <SetupCard
      title="Applications"
      description="Each job attempt groups a saved job, resume draft, status, and notes. New generates create or reuse an application for that job."
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
        <ul className="mt-4 space-y-4">
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
            };
            const updatedLabel = new Date(application.updatedAt).toLocaleString();

            return (
              <li
                key={application.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">Updated {updatedLabel}</p>
                </div>

                {jobUrl ? (
                  <p className="mt-1 text-xs text-slate-500">
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

                <p className="mt-2 text-xs text-slate-600">
                  Resume {artifactSummary.resumeLabel} · Cover letter{" "}
                  {artifactSummary.coverLetterLabel} · Company context{" "}
                  {hasUsableCompanyContext(application.companyContext)
                    ? "✓"
                    : "— none"}
                </p>

                {application.jobDescriptionId ? (
                  <p className="mt-2">
                    <Link
                      href={`/generate?jobId=${application.jobDescriptionId}`}
                      className="text-xs font-medium text-blue-700 underline"
                    >
                      Edit company context on Generate page
                    </Link>
                  </p>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                      {APPLICATION_RECORD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatApplicationStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Current: {formatApplicationStatusLabel(application.status)}
                      {state.isSavingStatus ? " · Saving…" : ""}
                    </p>
                  </div>

                  <div>
                    <p className={labelClassName}>Linked resume draft</p>
                    {latestDraft ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-sm text-slate-800">
                          {formatDraftStatusLabel(latestDraft.status)}
                          {latestDraft.modelName ? ` · ${latestDraft.modelName}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Updated {new Date(latestDraft.updatedAt).toLocaleString()}
                        </p>
                        <Link
                          href={`/resume-preview/${latestDraft.id}`}
                          className={`mt-2 inline-flex ${secondaryButtonClassName}`}
                        >
                          Open latest draft
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">No linked draft yet.</p>
                    )}
                    {latestCoverLetter ? (
                      <Link
                        href={`/cover-letter-preview/${latestCoverLetter.id}`}
                        className={`mt-2 inline-flex ${secondaryButtonClassName}`}
                      >
                        Open formal cover letter
                      </Link>
                    ) : latestDraft ? (
                      <Link
                        href={`/resume-preview/${latestDraft.id}`}
                        className={`mt-2 inline-flex ${secondaryButtonClassName}`}
                      >
                        Generate cover letter
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor={`application-notes-${application.id}`} className={labelClassName}>
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
                    className={`mt-2 ${primaryButtonClassName}`}
                  >
                    {state.isSavingNotes ? "Saving notes…" : "Save notes"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SetupCard>
  );
}
