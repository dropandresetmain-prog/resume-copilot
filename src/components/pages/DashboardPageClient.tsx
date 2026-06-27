"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { formatApplicationStatusLabel } from "@/lib/application/labels";
import { listApplicationRecordsFromCloud } from "@/lib/supabase/application-records";
import type { StoredApplicationRecord } from "@/types/application-record";

function vaultCompletionPercent(totals: {
  resumes: number;
  workExperiences: number;
  educationItems: number;
  skillCategories: number;
}): number {
  const checks = [
    totals.resumes > 0,
    totals.workExperiences > 0,
    totals.educationItems > 0,
    totals.skillCategories > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-folio-surface-container text-sm font-semibold text-folio-on-surface-variant">
      {initials || "?"}
    </div>
  );
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

export function DashboardPageClient() {
  const { totals, isSignedIn } = useWorkspace();
  const [applications, setApplications] = useState<StoredApplicationRecord[]>([]);

  const vaultPct = vaultCompletionPercent(totals);
  const activeApplications = applications.filter((a) => a.status !== "archived");

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    listApplicationRecordsFromCloud()
      .then((rows) => {
        if (!cancelled) setApplications(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return (
    <div className="max-w-[860px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
            Your applications
          </h1>
          <p className="mt-1 text-sm text-folio-outline">
            Manage and track your active job pursuits.
          </p>
        </div>
        <Link
          href="/generate"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-folio-cta px-4 py-2.5 text-sm font-medium text-white transition hover:bg-folio-cta-hover"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Add a job
        </Link>
      </div>

      {/* Vault health banner */}
      <div className="mt-6 rounded-xl border border-folio-sage-border bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-folio-primary)"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-sm font-medium text-folio-on-surface">
              Career vault is {vaultPct}% complete
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-folio-primary">{vaultPct}%</span>
            <Link
              href="/inventory"
              className="text-sm font-medium text-folio-primary hover:underline"
            >
              Fill the gaps →
            </Link>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-folio-surface-dim">
          <div
            className="h-full rounded-full bg-folio-primary transition-all"
            style={{ width: `${vaultPct}%` }}
          />
        </div>
      </div>

      {/* Application list */}
      <div className="mt-6 space-y-3">
        {activeApplications.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-folio-sage-border bg-white px-8 py-16 text-center">
            <h2 className="text-[18px] font-medium text-folio-on-surface">Add your first job</h2>
            <p className="mt-2 max-w-xs text-sm text-folio-outline">
              Paste a job description and Folio will tailor your resume and cover letter.
            </p>
            <Link
              href="/generate"
              className="mt-6 flex items-center gap-2 rounded-lg bg-folio-cta px-4 py-2.5 text-sm font-medium text-white transition hover:bg-folio-cta-hover"
            >
              + Add a job
            </Link>
          </div>
        ) : (
          activeApplications.map((app) => {
            const company = app.companyName ?? "Company";
            const role = app.roleTitle ?? "Role";
            const dateAdded = new Date(app.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <div
                key={app.id}
                className="flex items-center gap-4 rounded-xl border border-folio-sage-border bg-white px-4 py-4"
              >
                <CompanyAvatar name={company} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-folio-on-surface">
                    {company}
                    <span className="font-normal text-folio-outline"> · {role}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-folio-outline">Added {dateAdded}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(app.status)}`}
                >
                  {formatApplicationStatusLabel(app.status)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
