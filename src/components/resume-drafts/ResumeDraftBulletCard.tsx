"use client";

import { useState } from "react";

import {
  formatConfidenceLabel,
  formatRiskFlagLabel,
  formatSourceRefLabel,
  hasSourceRefs,
  reviewStatusClassName,
  reviewStatusLabel,
} from "@/lib/resume-draft/preview-helpers";
import type { ReviewItemStatus } from "@/lib/resume-draft/review-state";
import type { ResumeDraftExperienceBullet } from "@/types/resume-draft";

import { formFieldClassName, secondaryButtonClassName } from "@/components/setup/ui";

type ResumeDraftBulletCardProps = {
  bullet: ResumeDraftExperienceBullet;
  reviewStatus: ReviewItemStatus;
  editedText?: string;
  onAccept: () => void;
  onEdit: (text: string) => void;
  onReject: () => void;
};

export function ResumeDraftBulletCard({
  bullet,
  reviewStatus,
  editedText,
  onAccept,
  onEdit,
  onReject,
}: ResumeDraftBulletCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(editedText ?? bullet.text);

  const displayText =
    reviewStatus === "edited" && editedText !== undefined ? editedText : bullet.text;

  function handleSaveEdit() {
    onEdit(draftText);
    setIsEditing(false);
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${reviewStatusClassName(reviewStatus)}`}
        >
          {reviewStatusLabel(reviewStatus)}
        </span>
        <span className="text-xs text-slate-500">{formatConfidenceLabel(bullet.confidence)}</span>
      </div>

      {isEditing ? (
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          rows={4}
          className={`${formFieldClassName} mt-3`}
        />
      ) : (
        <p
          className={`mt-3 text-sm leading-relaxed text-slate-800 ${
            reviewStatus === "rejected" ? "line-through text-slate-500" : ""
          }`}
        >
          {displayText}
        </p>
      )}

      {bullet.jdAlignmentReason ? (
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">JD alignment:</span>{" "}
          {bullet.jdAlignmentReason}
        </p>
      ) : null}

      {bullet.riskFlags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {bullet.riskFlags.map((flag) => (
            <li
              key={flag}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900"
            >
              {formatRiskFlagLabel(flag)}
            </li>
          ))}
        </ul>
      ) : null}

      {hasSourceRefs(bullet.sourceRefs) ? (
        <div className="mt-2 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Source references</p>
          <ul className="mt-1 space-y-1">
            {bullet.sourceRefs.map((ref) => (
              <li key={`${ref.filename}-${ref.bulletKey}-${ref.collatedBulletId}`}>
                {formatSourceRefLabel(ref)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <button type="button" onClick={handleSaveEdit} className={secondaryButtonClassName}>
              Apply local edit
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftText(editedText ?? bullet.text);
                setIsEditing(false);
              }}
              className={secondaryButtonClassName}
            >
              Cancel
            </button>
            <p className="w-full text-xs text-slate-500">
              Updates the preview only until you click Save resume edits.
            </p>
          </>
        ) : (
          <>
            <button type="button" onClick={onAccept} className={secondaryButtonClassName}>
              Accept
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftText(editedText ?? bullet.text);
                setIsEditing(true);
              }}
              className={secondaryButtonClassName}
            >
              Edit
            </button>
            <button type="button" onClick={onReject} className={secondaryButtonClassName}>
              Omit
            </button>
          </>
        )}
      </div>
    </article>
  );
}
