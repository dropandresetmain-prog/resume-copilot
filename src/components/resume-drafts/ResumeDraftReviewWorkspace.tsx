"use client";

import { useMemo, useState } from "react";

import { FinalResumeLayoutPreview } from "@/components/resume-drafts/FinalResumeLayoutPreview";
import { ResumeDraftBulletCard } from "@/components/resume-drafts/ResumeDraftBulletCard";
import { ResumeDraftSectionCard } from "@/components/resume-drafts/ResumeDraftSectionCard";
import {
  formFieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { formatRiskFlagLabel, reviewStatusClassName, reviewStatusLabel } from "@/lib/resume-draft/preview-helpers";
import {
  buildFinalResumeLayout,
  estimatePageFit,
} from "@/lib/resume-draft/layout";
import {
  applyReviewStateToContent,
  countReviewDecisions,
  createInitialReviewState,
  updateAdditionalExperienceReview,
  updateEducationBulletReview,
  updateExperienceBulletReview,
  updateProfessionalSummaryReview,
  updateSkillsGroupReview,
  type ResumeDraftReviewState,
} from "@/lib/resume-draft/review-state";
import { updateGeneratedResumeDraftInCloud } from "@/lib/supabase/generated-resume-drafts";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ResumeDraftReviewWorkspaceProps = {
  draft: GeneratedResumeDraftRecord;
  onDraftUpdated: (draft: GeneratedResumeDraftRecord) => void;
};

export function ResumeDraftReviewWorkspace({
  draft,
  onDraftUpdated,
}: ResumeDraftReviewWorkspaceProps) {
  const [reviewState, setReviewState] = useState<ResumeDraftReviewState>(() =>
    createInitialReviewState(draft.content),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(draft.content.professionalSummary.text);

  const previewContent = useMemo(
    () => applyReviewStateToContent(draft.content, reviewState),
    [draft.content, reviewState],
  );
  const finalLayout = useMemo(() => buildFinalResumeLayout(previewContent), [previewContent]);
  const pageFit = useMemo(() => estimatePageFit(finalLayout), [finalLayout]);
  const showProfessionalSummary = Boolean(draft.content.professionalSummary.text?.trim());

  const reviewCounts = useMemo(() => countReviewDecisions(reviewState), [reviewState]);
  const isReviewed = draft.status === "reviewed";

  async function handleMarkReviewed() {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Persist reviewed/edited generated draft content only — never source inventory.
      const reviewedContent = applyReviewStateToContent(draft.content, reviewState, {
        includePending: true,
      });

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: reviewedContent,
        status: "reviewed",
      });

      onDraftUpdated(updated);
      setReviewState(createInitialReviewState(updated.content));
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save reviewed draft.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <SetupCard
        title="Edit resume details"
        description="Secondary review workspace for accept/edit/omit changes. Use the layout preview page for final formatting validation."
      >
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>
            Status: <strong className="text-slate-900">{draft.status}</strong>
          </span>
          <span>Pending: {reviewCounts.pending}</span>
          <span>Accepted: {reviewCounts.accepted}</span>
          <span>Edited: {reviewCounts.edited}</span>
          <span>Omitted: {reviewCounts.rejected}</span>
        </div>

        <FinalResumeLayoutPreview layout={finalLayout} pageFit={pageFit} className="mt-4" />

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Debug JSON
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto text-xs text-slate-800">
            {JSON.stringify(
              {
                content: previewContent,
                rationale: draft.rationale,
                reviewState,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </SetupCard>

      <SetupCard
        title="Review generated sections"
        description="Accept, edit, or omit generated text. Changes stay in this draft until you mark it reviewed."
      >
        {draft.rationale ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Overall rationale</p>
            <p className="mt-2">{draft.rationale.overall}</p>
            {draft.rationale.toneNotes ? (
              <p className="mt-2 text-slate-600">
                <span className="font-medium">Tone:</span> {draft.rationale.toneNotes}
              </p>
            ) : null}
            {draft.rationale.keywordUsage.length > 0 ? (
              <div className="mt-3">
                <p className="font-medium text-slate-900">Keyword usage</p>
                <p className="mt-1">{draft.rationale.keywordUsage.join(" · ")}</p>
              </div>
            ) : null}
            {draft.rationale.omissions.length > 0 ? (
              <div className="mt-3">
                <p className="font-medium text-slate-900">Omissions</p>
                <ul className="mt-1 list-disc pl-5">
                  {draft.rationale.omissions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {draft.content.globalRiskFlags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {draft.content.globalRiskFlags.map((flag) => (
              <li
                key={flag}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900"
              >
                {formatRiskFlagLabel(flag)}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 space-y-6">
          {showProfessionalSummary ? (
          <ResumeDraftSectionCard title="Professional summary">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${reviewStatusClassName(reviewState.professionalSummary.status)}`}
              >
                {reviewStatusLabel(reviewState.professionalSummary.status)}
              </span>
              {summaryEditing ? (
                <textarea
                  value={summaryDraft}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                  rows={4}
                  className={`${formFieldClassName} mt-3`}
                />
              ) : (
                <p className="mt-3 text-sm text-slate-800">
                  {reviewState.professionalSummary.status === "edited" &&
                  reviewState.professionalSummary.editedText !== undefined
                    ? reviewState.professionalSummary.editedText
                    : draft.content.professionalSummary.text}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {summaryEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewState((current) =>
                          updateProfessionalSummaryReview(current, {
                            status: "edited",
                            editedText: summaryDraft,
                          }),
                        );
                        setSummaryEditing(false);
                      }}
                      className={secondaryButtonClassName}
                    >
                      Save edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryDraft(
                          reviewState.professionalSummary.editedText ??
                            draft.content.professionalSummary.text,
                        );
                        setSummaryEditing(false);
                      }}
                      className={secondaryButtonClassName}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewState((current) =>
                          updateProfessionalSummaryReview(current, { status: "accepted" }),
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryDraft(
                          reviewState.professionalSummary.editedText ??
                            draft.content.professionalSummary.text,
                        );
                        setSummaryEditing(true);
                      }}
                      className={secondaryButtonClassName}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewState((current) =>
                          updateProfessionalSummaryReview(current, { status: "rejected" }),
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      Omit
                    </button>
                  </>
                )}
              </div>
            </div>
          </ResumeDraftSectionCard>
          ) : null}

          {draft.content.skills.groups.map((group, groupIndex) => {
            const review = reviewState.skillsGroups[groupIndex];
            const itemsText = (review?.editedItems ?? group.items).join("\n");

            return (
              <ResumeDraftSectionCard
                key={`${group.label}-${groupIndex}`}
                title={`Skills: ${group.label}`}
              >
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <textarea
                    defaultValue={itemsText}
                    rows={3}
                    className={formFieldClassName}
                    onBlur={(event) => {
                      const editedItems = event.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean);
                      setReviewState((current) =>
                        updateSkillsGroupReview(current, groupIndex, {
                          status: "edited",
                          editedItems,
                          editedLabel: group.label,
                        }),
                      );
                    }}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewState((current) =>
                          updateSkillsGroupReview(current, groupIndex, { status: "accepted" }),
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewState((current) =>
                          updateSkillsGroupReview(current, groupIndex, { status: "rejected" }),
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      Omit
                    </button>
                  </div>
                </div>
              </ResumeDraftSectionCard>
            );
          })}

          {draft.content.experience.map((experience, experienceIndex) => (
            <ResumeDraftSectionCard
              key={`${experience.company}-${experience.role}-${experienceIndex}`}
              title={`${experience.role} · ${experience.company}`}
              description={experience.dateRange}
            >
              {experience.bullets.map((bullet, bulletIndex) => (
                <ResumeDraftBulletCard
                  key={`${bullet.text}-${bulletIndex}`}
                  bullet={bullet}
                  reviewStatus={
                    reviewState.experienceBullets[experienceIndex]?.[bulletIndex]?.status ??
                    "pending"
                  }
                  editedText={
                    reviewState.experienceBullets[experienceIndex]?.[bulletIndex]?.editedText
                  }
                  onAccept={() =>
                    setReviewState((current) =>
                      updateExperienceBulletReview(current, experienceIndex, bulletIndex, {
                        status: "accepted",
                      }),
                    )
                  }
                  onEdit={(text) =>
                    setReviewState((current) =>
                      updateExperienceBulletReview(current, experienceIndex, bulletIndex, {
                        status: "edited",
                        editedText: text,
                      }),
                    )
                  }
                  onReject={() =>
                    setReviewState((current) =>
                      updateExperienceBulletReview(current, experienceIndex, bulletIndex, {
                        status: "rejected",
                      }),
                    )
                  }
                />
              ))}
            </ResumeDraftSectionCard>
          ))}

          {draft.content.education.map((item, educationIndex) => (
            <ResumeDraftSectionCard
              key={`${item.institution}-${educationIndex}`}
              title={`Education: ${item.institution}`}
            >
              {item.bullets.map((bullet, bulletIndex) => (
                <div
                  key={`${bullet}-${bulletIndex}`}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <p className="text-sm text-slate-800">{bullet}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewState((current) =>
                          updateEducationBulletReview(current, educationIndex, bulletIndex, {
                            status: "accepted",
                          }),
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewState((current) =>
                          updateEducationBulletReview(current, educationIndex, bulletIndex, {
                            status: "rejected",
                          }),
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      Omit
                    </button>
                  </div>
                </div>
              ))}
            </ResumeDraftSectionCard>
          ))}

          {draft.content.additionalExperience.map((item, itemIndex) => (
            <ResumeDraftSectionCard
              key={`${item.text}-${itemIndex}`}
              title={item.category ? `Additional: ${item.category}` : "Additional experience"}
            >
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-800">{item.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setReviewState((current) =>
                        updateAdditionalExperienceReview(current, itemIndex, {
                          status: "accepted",
                        }),
                      )
                    }
                    className={secondaryButtonClassName}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReviewState((current) =>
                        updateAdditionalExperienceReview(current, itemIndex, {
                          status: "rejected",
                        }),
                      )
                    }
                    className={secondaryButtonClassName}
                  >
                    Omit
                  </button>
                </div>
              </div>
            </ResumeDraftSectionCard>
          ))}
        </div>

        {saveError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {saveError}
          </p>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleMarkReviewed}
            disabled={isSaving || isReviewed}
            className={primaryButtonClassName}
          >
            {isReviewed ? "Marked as reviewed" : isSaving ? "Saving…" : "Mark as reviewed"}
          </button>
        </div>
      </SetupCard>
    </div>
  );
}
