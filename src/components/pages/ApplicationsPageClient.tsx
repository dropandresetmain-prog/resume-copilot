"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { ApplicationCard, ApplicationDetails, type ApplicationDetailsProps } from "@/components/pages/ApplicationCard";
import { formatApplicationStatusLabel } from "@/lib/application/labels";
import { buildDraftListDisplays } from "@/lib/resume-draft/draft-labels";
import {
  archiveApplicationRecordInCloud,
  listApplicationRecordsFromCloud,
  updateApplicationRecordInCloud,
} from "@/lib/supabase/application-records";
import { listGeneratedCoverLetterDraftsFromCloud } from "@/lib/supabase/generated-cover-letter-drafts";
import { listGeneratedResumeDraftsFromCloud } from "@/lib/supabase/generated-resume-drafts";
import { listJobDescriptionsFromCloud } from "@/lib/supabase/job-descriptions";
import {
  type ApplicationRecordStatus,
  type StoredApplicationRecord,
} from "@/types/application-record";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";
import type { StoredJobDescription } from "@/types/jd";

type FilterTab = "all" | "applied" | "interview" | "rejected" | "archived";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function emptyMessageForFilter(filter: FilterTab): string {
  switch (filter) {
    case "rejected":
      return "No rejections yet — keep going.";
    case "interview":
      return "No interviews scheduled yet.";
    case "applied":
      return "No applications submitted yet.";
    case "archived":
      return "Nothing archived yet.";
    default:
      return "No applications yet.";
  }
}

function filterApplications(
  applications: StoredApplicationRecord[],
  filter: FilterTab,
): StoredApplicationRecord[] {
  // "all" shows active (non-archived) records; archived records only appear under the Archived tab
  if (filter === "all") return applications.filter((a) => a.status !== "archived");
  if (filter === "applied") return applications.filter((a) => a.status === "applied");
  if (filter === "interview") return applications.filter((a) => a.status === "interview");
  if (filter === "rejected") return applications.filter((a) => a.status === "rejected");
  if (filter === "archived") return applications.filter((a) => a.status === "archived");
  return applications;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    /* status colours — intentional */
    case "resume_generated":
      return "bg-[#e8f5ef] text-[#016147] border-[#88d6b5]";
    case "ready_to_apply":
      return "bg-[#d0ede2] text-[#00513b] border-[#016147]";
    case "applied":
      return "bg-[#c5e8d8] text-[#00513b] border-[#016147]";
    case "rejected":
      return "bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]";
    case "archived":
      return "bg-folio-surface-dim text-folio-outline border-folio-outline-variant";
    default:
      return "bg-folio-surface-container text-folio-outline border-folio-outline-variant";
  }
}

export function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-folio-surface-container text-xs font-semibold text-folio-on-surface-variant">
      {initials || "?"}
    </div>
  );
}

function buildLatestDraftByApplicationId(
  drafts: GeneratedResumeDraftRecord[],
): Map<string, GeneratedResumeDraftRecord> {
  const map = new Map<string, GeneratedResumeDraftRecord>();
  for (const draft of drafts) {
    if (!draft.applicationId) continue;
    const current = map.get(draft.applicationId);
    if (!current || new Date(draft.updatedAt) > new Date(current.updatedAt)) {
      map.set(draft.applicationId, draft);
    }
  }
  return map;
}

function buildLatestCoverLetterByApplicationId(
  coverLetters: GeneratedCoverLetterDraftRecord[],
): Map<string, GeneratedCoverLetterDraftRecord> {
  const map = new Map<string, GeneratedCoverLetterDraftRecord>();
  for (const letter of coverLetters) {
    if (!letter.applicationId) continue;
    const current = map.get(letter.applicationId);
    if (!current || new Date(letter.updatedAt) > new Date(current.updatedAt)) {
      map.set(letter.applicationId, letter);
    }
  }
  return map;
}

export function ApplicationsPageClient() {
  const { isSignedIn } = useWorkspace();
  const [applications, setApplications] = useState<StoredApplicationRecord[]>([]);
  const [drafts, setDrafts] = useState<GeneratedResumeDraftRecord[]>([]);
  const [coverLetters, setCoverLetters] = useState<GeneratedCoverLetterDraftRecord[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<StoredJobDescription[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [notesDraftById, setNotesDraftById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    Promise.all([
      // Load with includeArchived so the Archived tab can show archived records
      listApplicationRecordsFromCloud({ includeArchived: true }),
      listGeneratedResumeDraftsFromCloud(),
      listGeneratedCoverLetterDraftsFromCloud(),
      listJobDescriptionsFromCloud(),
    ])
      .then(([appRows, draftRows, clRows, jdRows]) => {
        if (cancelled) return;
        setApplications(appRows);
        setDrafts(draftRows);
        setCoverLetters(clRows);
        setJobDescriptions(jdRows);
        setNotesDraftById(
          Object.fromEntries(appRows.map((r) => [r.id, r.notes ?? ""])),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load applications.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const latestDraftByApplicationId = useMemo(
    () => buildLatestDraftByApplicationId(drafts),
    [drafts],
  );
  const latestCoverLetterByApplicationId = useMemo(
    () => buildLatestCoverLetterByApplicationId(coverLetters),
    [coverLetters],
  );
  const jobById = useMemo(
    () => new Map(jobDescriptions.map((jd) => [jd.id, jd])),
    [jobDescriptions],
  );
  const unlinkedDrafts = useMemo(
    () => drafts.filter((d) => !d.applicationId),
    [drafts],
  );
  const unlinkedDraftDisplays = useMemo(
    () => buildDraftListDisplays(unlinkedDrafts, jobById),
    [unlinkedDrafts, jobById],
  );

  const filteredApplications = filterApplications(applications, activeFilter);

  async function handleArchive(app: StoredApplicationRecord) {
    const confirmed = window.confirm(
      `Archive "${app.companyName ?? "this application"}"?\n\nLinked drafts are not deleted.`,
    );
    if (!confirmed) return;
    setArchivingId(app.id);
    try {
      await archiveApplicationRecordInCloud(app.id);
      setApplications((current) =>
        current.map((a) => (a.id === app.id ? { ...a, status: "archived" } : a)),
      );
      setExpandedAppId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive application.");
    } finally {
      setArchivingId(null);
    }
  }

  async function handleStatusChange(app: StoredApplicationRecord, status: ApplicationRecordStatus) {
    setSavingStatusId(app.id);
    setError(null);
    try {
      const updated = await updateApplicationRecordInCloud(app.id, { status });
      setApplications((current) =>
        current.map((a) => (a.id === updated.id ? updated : a)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSavingStatusId(null);
    }
  }

  async function handleSaveNotes(app: StoredApplicationRecord) {
    const notes = notesDraftById[app.id] ?? "";
    setSavingNotesId(app.id);
    setError(null);
    try {
      const updated = await updateApplicationRecordInCloud(app.id, { notes });
      setApplications((current) =>
        current.map((a) => (a.id === updated.id ? updated : a)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      setSavingNotesId(null);
    }
  }

  // Shared by the desktop table's expanded row and the mobile card's expanded
  // section — same underlying <ApplicationDetails /> either way.
  function buildDetailsProps(
    app: StoredApplicationRecord,
    latestDraft: GeneratedResumeDraftRecord | undefined,
    latestCoverLetter: GeneratedCoverLetterDraftRecord | undefined,
  ): ApplicationDetailsProps {
    return {
      app,
      latestDraft,
      latestCoverLetter,
      jobDescription: app.jobDescriptionId ? jobById.get(app.jobDescriptionId) : undefined,
      notesDraft: notesDraftById[app.id] ?? "",
      onNotesChange: (value) =>
        setNotesDraftById((prev) => ({ ...prev, [app.id]: value })),
      onSaveNotes: () => void handleSaveNotes(app),
      savingNotes: savingNotesId === app.id,
      onStatusChange: (status) => void handleStatusChange(app, status),
      savingStatus: savingStatusId === app.id,
    };
  }

  return (
    <div className="max-w-[860px]">
      <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
        Applications
      </h1>

      {error ? (
        <p className="mt-4 text-sm text-[#93000a]">{error}</p>
      ) : null}

      {!isSignedIn ? (
        <p className="mt-4 text-sm text-folio-outline">Sign in to view your applications.</p>
      ) : (
        <>
          {/* Status summary strip — derived from local state, no API call */}
          {applications.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {(
                [
                  { key: "drafting", label: "Drafting" },
                  { key: "resume_generated", label: "Ready" },
                  { key: "applied", label: "Applied" },
                  { key: "interview", label: "Interview" },
                  { key: "rejected", label: "Rejected" },
                  { key: "archived", label: "Archived" },
                ] as const
              ).map(({ key, label }) => {
                const count = applications.filter((a) => a.status === key).length;
                if (count === 0) return null;
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(key)}`}
                  >
                    {label}
                    <span className="rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      {count}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Filter pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  activeFilter === tab.key
                    ? "border-folio-primary bg-folio-primary text-white"
                    : "border-folio-outline-variant bg-white text-folio-on-surface-variant hover:border-folio-outline",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Applications: table at md+, stacked cards below md */}
          {filteredApplications.length === 0 ? (
            <div className="mt-5 rounded-xl border border-folio-sage-border bg-white px-6 py-16 text-center text-sm text-folio-outline">
              {emptyMessageForFilter(activeFilter)}
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-xl border border-folio-sage-border bg-white md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-folio-sage-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                        Role
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline sm:table-cell">
                        Date added
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                        Resume
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                        Cover letter
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app, i) => {
                      const company = app.companyName ?? "Company";
                      const role = app.roleTitle ?? "—";
                      const dateAdded = new Date(app.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const latestDraft = latestDraftByApplicationId.get(app.id);
                      const latestCoverLetter = latestCoverLetterByApplicationId.get(app.id);
                      const isLast = i === filteredApplications.length - 1;
                      const isExpanded = expandedAppId === app.id;

                      return (
                        <Fragment key={app.id}>
                          <tr
                            className={isLast && !isExpanded ? "" : "border-b border-folio-surface-container"}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <CompanyAvatar name={company} />
                                <span className="font-medium text-folio-on-surface">{company}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-folio-on-surface-variant">{role}</td>
                            <td className="hidden px-4 py-3 text-folio-outline sm:table-cell">
                              {dateAdded}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(app.status)}`}
                              >
                                {formatApplicationStatusLabel(app.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs" data-testid="artifact-resume">
                              {Boolean(latestDraft) ? (
                                <span className="font-semibold text-[#016147]">✓</span>
                              ) : (
                                <span className="text-folio-outline-variant">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs" data-testid="artifact-cover-letter">
                              {Boolean(latestCoverLetter) ? (
                                <span className="font-semibold text-[#016147]">✓</span>
                              ) : (
                                <span className="text-folio-outline-variant">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {latestDraft ? (
                                  <Link
                                    href={`/output/${latestDraft.id}`}
                                    title="Open package"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-folio-outline transition hover:bg-folio-surface-container hover:text-folio-on-surface"
                                    data-testid="open-package-link"
                                  >
                                    {/* Eye icon */}
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
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                  </Link>
                                ) : (
                                  <span
                                    title="No draft yet"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-folio-outline-variant"
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
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  title={isExpanded ? "Hide details" : "Details"}
                                  onClick={() =>
                                    setExpandedAppId(isExpanded ? null : app.id)
                                  }
                                  aria-expanded={isExpanded}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-folio-outline transition hover:bg-folio-surface-container hover:text-folio-on-surface"
                                >
                                  {/* Chevron icon */}
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
                                  disabled={archivingId === app.id}
                                  onClick={() => void handleArchive(app)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-folio-outline transition hover:bg-folio-surface-container hover:text-folio-on-surface disabled:opacity-40"
                                >
                                  {/* Archive/box icon */}
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
                            </td>
                          </tr>

                          {isExpanded ? (
                            <tr className={isLast ? "" : "border-b border-folio-surface-container"}>
                              <td
                                colSpan={7}
                                className="bg-folio-surface-container-low px-4 pb-4 pt-3"
                              >
                                <ApplicationDetails
                                  {...buildDetailsProps(app, latestDraft, latestCoverLetter)}
                                />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 space-y-3 md:hidden">
                {filteredApplications.map((app) => {
                  const company = app.companyName ?? "Company";
                  const role = app.roleTitle ?? "—";
                  const dateAdded = new Date(app.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const latestDraft = latestDraftByApplicationId.get(app.id);
                  const latestCoverLetter = latestCoverLetterByApplicationId.get(app.id);
                  const isExpanded = expandedAppId === app.id;

                  return (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      company={company}
                      role={role}
                      dateAdded={dateAdded}
                      latestDraft={latestDraft}
                      latestCoverLetter={latestCoverLetter}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setExpandedAppId(isExpanded ? null : app.id)}
                      onArchive={() => void handleArchive(app)}
                      archiving={archivingId === app.id}
                      detailsProps={buildDetailsProps(app, latestDraft, latestCoverLetter)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Saved-job management PD section */}
          {applications.some((a) => a.status !== "archived" && a.jobDescriptionId && jobById.has(a.jobDescriptionId)) ? (
            <details className="mt-6 rounded-xl border border-folio-sage-border bg-white" data-testid="saved-jobs-disclosure">
              <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium text-folio-on-surface">
                <span>Saved jobs</span>
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
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="border-t border-folio-sage-border px-4 pb-4 pt-3">
                <p className="mb-3 text-xs text-folio-outline">
                  Job descriptions saved to your application records. Navigate to Generate to re-use a saved job.
                </p>
                <ul className="space-y-2">
                  {applications
                    .filter((a) => a.status !== "archived" && a.jobDescriptionId && jobById.has(a.jobDescriptionId!))
                    .map((app) => {
                      const jd = jobById.get(app.jobDescriptionId!)!;
                      return (
                        <li
                          key={app.id}
                          className="rounded-lg border border-folio-outline-variant bg-folio-surface-container-low p-3 text-sm"
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-folio-on-surface">
                                {app.companyName ?? jd.companyName ?? "Company"}{" "}
                                {app.roleTitle ? `— ${app.roleTitle}` : ""}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-folio-on-surface-variant">
                                {jd.summary ?? jd.rawText.slice(0, 180)}
                              </p>
                            </div>
                            <Link
                              href={`/generate?jobId=${app.jobDescriptionId}`}
                              className="mt-2 shrink-0 rounded-lg border border-folio-outline-variant px-3 py-1 text-xs text-folio-on-surface transition hover:bg-folio-surface-container sm:mt-0"
                              data-testid="saved-job-reuse-link"
                            >
                              Re-use on Generate
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </details>
          ) : null}

          {/* Unlinked draft history PD section */}
          {unlinkedDrafts.length > 0 ? (
            <details className="mt-4 rounded-xl border border-folio-sage-border bg-white" data-testid="unlinked-drafts-disclosure">
              <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium text-folio-on-surface">
                <span>Unlinked drafts ({unlinkedDrafts.length})</span>
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
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="border-t border-folio-sage-border px-4 pb-4 pt-3">
                <p className="mb-3 text-xs text-folio-outline">
                  Resume drafts not linked to an application record. View only.
                </p>
                <ul className="space-y-2">
                  {unlinkedDrafts.map((draft, index) => {
                    const display = unlinkedDraftDisplays[index];
                    return (
                      <li
                        key={draft.id}
                        className="rounded-lg border border-folio-outline-variant bg-folio-surface-container-low p-3 text-sm"
                        data-testid="unlinked-draft-row"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-folio-on-surface">
                              {display?.primaryLabel ?? "Draft"}
                            </p>
                            <p className="mt-0.5 text-xs text-folio-outline">
                              {display?.timestampLabel ?? ""}
                            </p>
                          </div>
                          <Link
                            href={`/output/${draft.id}`}
                            className="mt-1 shrink-0 rounded-lg border border-folio-outline-variant px-3 py-1 text-xs text-folio-on-surface transition hover:bg-folio-surface-container sm:mt-0"
                            data-testid="unlinked-draft-link"
                          >
                            Open
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
