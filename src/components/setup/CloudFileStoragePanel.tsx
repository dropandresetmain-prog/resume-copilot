"use client";

import { useEffect, useState } from "react";

import { countResume } from "@/lib/inventory/inventory";
import { destructiveButtonClassName, EmptyState, SetupCard } from "@/components/setup/ui";
import { formatStorageBytes } from "@/lib/storage/file-metadata";
import { getOriginalResumeFileStorageStats } from "@/lib/supabase/files";
import type { StoredFileRecord } from "@/lib/supabase/types";
import type { ParsedResume } from "@/types/resume";

type CloudFileStoragePanelProps = {
  isSignedIn: boolean;
  refreshToken?: number;
  resumes: ParsedResume[];
  onDeleteResume: (resumeId: string) => void;
};

export function CloudFileStoragePanel({
  isSignedIn,
  refreshToken = 0,
  resumes,
  onDeleteResume,
}: CloudFileStoragePanelProps) {
  const [files, setFiles] = useState<StoredFileRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const stats = await getOriginalResumeFileStorageStats();
        if (!cancelled) {
          setFiles(stats.files);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load cloud file storage status.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, refreshToken]);

  const visibleFiles = isSignedIn ? files : [];
  const totalBytes = visibleFiles.reduce(
    (total, file) => total + (file.fileSize ?? 0),
    0,
  );
  const fileByName = new Map(visibleFiles.map((file) => [file.fileName, file]));

  function handleDelete(resume: ParsedResume) {
    const confirmed = window.confirm(
      `Delete "${resume.filename}" and its parsed inventory?`,
    );
    if (!confirmed) return;
    onDeleteResume(resume.id);
  }

  return (
    <SetupCard
      title="Uploaded resumes"
      description="One list for parsed inventory and stored original files. Delete behavior is unchanged."
    >
      <div className="mt-4 space-y-4 text-sm text-slate-700">
        {!isSignedIn ? (
          <p className="text-slate-500">
            Sign in to view stored original resume file sizes. Parsed resume inventory remains
            visible in this browser.
          </p>
        ) : null}
        {loadError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            {loadError}
          </p>
        ) : null}
        {isSignedIn ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Original resume files
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-950">
                {visibleFiles.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Approximate storage
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-950">
                {formatStorageBytes(totalBytes)}
              </dd>
            </div>
          </dl>
        ) : null}

        {resumes.length === 0 ? (
          <EmptyState
            title="No resumes uploaded"
            description="Upload one or more DOCX files to start building your inventory."
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {resumes.map((resume) => {
              const counts = countResume(resume);
              const storedFile = fileByName.get(resume.filename);

              return (
                <li
                  key={resume.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {resume.filename}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Uploaded {new Date(resume.uploadedAt).toLocaleString()}
                      {storedFile
                        ? ` · Original ${formatStorageBytes(storedFile.fileSize ?? 0)} stored ${new Date(
                            storedFile.createdAt,
                          ).toLocaleString()}`
                        : isSignedIn
                          ? " · Original file storage not found"
                          : ""}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {counts.workExperiences} experiences · {counts.workBullets} bullets ·{" "}
                      {counts.educationItems} education · {counts.skillCategories} skill categories
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(resume)}
                    aria-label={`Delete ${resume.filename}`}
                    className={destructiveButtonClassName}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SetupCard>
  );
}
