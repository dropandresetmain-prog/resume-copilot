"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { formatApplicationStatusLabel } from "@/lib/application/labels";
import {
  archiveApplicationRecordInCloud,
  listApplicationRecordsFromCloud,
} from "@/lib/supabase/application-records";
import { listGeneratedResumeDraftsFromCloud } from "@/lib/supabase/generated-resume-drafts";
import type { StoredApplicationRecord } from "@/types/application-record";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

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
  if (filter === "all") return applications;
  if (filter === "applied") return applications.filter((a) => a.status === "applied");
  if (filter === "interview") return [];
  if (filter === "rejected") return applications.filter((a) => a.status === "rejected");
  if (filter === "archived") return applications.filter((a) => a.status === "archived");
  return applications;
}

function statusBadgeClass(status: string): string {
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

function CompanyAvatar({ name }: { name: string }) {
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

export function ApplicationsPageClient() {
  const { isSignedIn } = useWorkspace();
  const [applications, setApplications] = useState<StoredApplicationRecord[]>([]);
  const [drafts, setDrafts] = useState<GeneratedResumeDraftRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    Promise.all([
      listApplicationRecordsFromCloud(),
      listGeneratedResumeDraftsFromCloud(),
    ])
      .then(([appRows, draftRows]) => {
        if (cancelled) return;
        setApplications(appRows);
        setDrafts(draftRows);
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

  const filteredApplications = filterApplications(applications, activeFilter);

  async function handleArchive(app: StoredApplicationRecord) {
    const confirmed = window.confirm(
      `Archive "${app.companyName ?? "this application"}"?\n\nLinked drafts are not deleted.`,
    );
    if (!confirmed) return;
    setArchivingId(app.id);
    try {
      await archiveApplicationRecordInCloud(app.id);
      setApplications((current) => current.filter((a) => a.id !== app.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive application.");
    } finally {
      setArchivingId(null);
    }
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
          {/* Filter pills */}
          <div className="mt-5 flex flex-wrap gap-2">
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

          {/* Table */}
          <div className="mt-5 overflow-hidden rounded-xl border border-folio-sage-border bg-white">
            {filteredApplications.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-folio-outline">
                {emptyMessageForFilter(activeFilter)}
              </div>
            ) : (
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
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline md:table-cell">
                      Date applied
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-folio-outline">
                      Status
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
                    const dateApplied = app.appliedAt
                      ? new Date(app.appliedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—";
                    const latestDraft = latestDraftByApplicationId.get(app.id);
                    const isLast = i === filteredApplications.length - 1;

                    return (
                      <tr
                        key={app.id}
                        className={isLast ? "" : "border-b border-folio-surface-container"}
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
                        <td className="hidden px-4 py-3 text-folio-outline md:table-cell">
                          {dateApplied}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(app.status)}`}
                          >
                            {formatApplicationStatusLabel(app.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {latestDraft ? (
                              <Link
                                href={`/resume-preview/${latestDraft.id}`}
                                title="View draft"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-folio-outline transition hover:bg-folio-surface-container hover:text-folio-on-surface"
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
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
