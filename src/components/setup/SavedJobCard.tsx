"use client";

import { useState } from "react";

import {
  destructiveButtonClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
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
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
          <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                disabled={disabled}
                className={secondaryButtonClassName}
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                className={destructiveButtonClassName}
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
