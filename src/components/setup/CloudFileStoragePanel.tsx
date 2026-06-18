"use client";

import { useEffect, useState } from "react";

import { SetupCard } from "@/components/setup/ui";
import { formatStorageBytes } from "@/lib/storage/file-metadata";
import { getOriginalResumeFileStorageStats } from "@/lib/supabase/files";
import type { StoredFileRecord } from "@/lib/supabase/types";

type CloudFileStoragePanelProps = {
  isSignedIn: boolean;
  refreshToken?: number;
};

export function CloudFileStoragePanel({
  isSignedIn,
  refreshToken = 0,
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

  return (
    <SetupCard
      title="Cloud file storage"
      description="Original uploaded resume files are stored in private Supabase Storage when you are signed in."
    >
      <div className="mt-4 space-y-3 text-sm text-zinc-700">
        {!isSignedIn ? (
          <p className="text-zinc-500">Sign in to view stored original resume files.</p>
        ) : null}
        {loadError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            {loadError}
          </p>
        ) : null}
        {isSignedIn ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Original resume files
                </dt>
                <dd className="mt-1 text-base font-medium text-zinc-900">
                  {visibleFiles.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Approximate storage
                </dt>
                <dd className="mt-1 text-base font-medium text-zinc-900">
                  {formatStorageBytes(totalBytes)}
                </dd>
              </div>
            </dl>
            {visibleFiles.length > 0 ? (
              <ul className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                {visibleFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-medium text-zinc-900">{file.fileName}</span>
                    <span className="text-zinc-500">
                      {formatStorageBytes(file.fileSize ?? 0)} ·{" "}
                      {new Date(file.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-500">No original resume files stored yet.</p>
            )}
          </>
        ) : null}
      </div>
    </SetupCard>
  );
}
