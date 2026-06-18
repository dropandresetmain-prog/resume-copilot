"use client";

import { useState } from "react";

import { formatSavedJobLabel } from "@/lib/jd/labels";
import { getSavedJobPreviewText } from "@/lib/jd/summary";
import type { StoredJobDescription } from "@/types/jd";

type SavedJobCardProps = {
  job: StoredJobDescription;
  isEditing?: boolean;
  disabled?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function SavedJobCard({
  job,
  isEditing = false,
  disabled = false,
  onEdit,
  onDelete,
}: SavedJobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = getSavedJobPreviewText(job);

  return (
    <li
      className={`rounded-lg border p-4 ${
        isEditing ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{formatSavedJobLabel(job)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Created {new Date(job.createdAt).toLocaleString()} · Updated{" "}
            {new Date(job.updatedAt).toLocaleString()}
          </p>
          {job.jobUrl ? (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-violet-700 hover:underline"
            >
              {job.jobUrl}
            </a>
          ) : null}
          {!expanded ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{preview}</p>
          ) : (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{job.rawText}</pre>
            </div>
          )}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-2 text-sm font-medium text-violet-700 hover:underline"
          >
            {expanded ? "Show less" : "View full job description"}
          </button>
        </div>
        {onEdit || onDelete ? (
          <div className="flex shrink-0 gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                disabled={disabled}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
