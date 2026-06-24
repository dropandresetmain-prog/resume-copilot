"use client";

import { useEffect, useMemo, useState } from "react";

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
import { resolveDraftStatusAfterContentEdit } from "@/lib/resume-draft/apply-evidence-changes";
import { optimizeResumePreviewSettings } from "@/lib/resume-draft/preview-optimizer";
import {
  buildFinalResumeLayout,
  estimatePageFit,
} from "@/lib/resume-draft/layout";
import {
  applyReviewStateToContent,
  countReviewDecisions,
  createInitialReviewState,
  reviewStateDiffersFromSavedContent,
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
  /** Package page mode: hide browser layout preview and rationale blocks. */
  packageMode?: boolean;
};

export function ResumeDraftReviewWorkspace({
  draft,
  onDraftUpdated,
  packageMode = false,
}: ResumeDraftReviewWorkspaceProps) {
  const [reviewState, setReviewState] = useState<ResumeDraftReviewState>(() =>
    createInitialReviewState(draft.content),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(draft.content.professionalSummary.text);
  const [headerDraft, setHeaderDraft] = useState(draft.content.header);

  const hasUnsavedChanges = useMemo(() => {
    if (reviewStateDiffersFromSavedContent(draft.content, reviewState)) {
      return true;
    }
    return JSON.stringify(headerDraft) !== JSON.stringify(draft.content.header);
  }, [draft.content, reviewState, headerDraft]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const previewContent = useMemo(
    () => applyReviewStateToContent(draft.content, reviewState),
    [draft.content, reviewState],
  );
  const finalLayout = useMemo(() => buildFinalResumeLayout(previewContent), [previewContent]);
  const autoSettings = useMemo(
    () => optimizeResumePreviewSettings(previewContent),
    [previewContent],
  );
  const pageFit = useMemo(
    () =>
      estimatePageFit(finalLayout, {
        bodyFontPx: autoSettings.bodyFontPx,
        marginMm: autoSettings.marginMm,
        marginTopMm: autoSettings.marginTopMm,
        lineSpacing: autoSettings.lineSpacing,
        sectionSpacing: autoSettings.sectionSpacing,
      }),
    [finalLayout, autoSettings],
  );
  const showProfessionalSummary = Boolean(draft.content.professionalSummary.text?.trim());

  const reviewCounts = useMemo(() => countReviewDecisions(reviewState), [reviewState]);

  function formatLastSavedLabel(savedAt: Date | null): string | null {
    if (!savedAt) {
      return null;
    }
    return `Last saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  async function handleSaveResumeEdits() {
    setIsSaving(true);
    setSaveError(null);

    try {
      const reviewedContent = applyReviewStateToContent(draft.content, reviewState, {
        includePending: true,
      });
      reviewedContent.header = headerDraft;

      const nextStatus = resolveDraftStatusAfterContentEdit(draft.status);

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: {
          ...reviewedContent,
          serverPdfValidation: undefined,
        },
        status: nextStatus,
      });

      onDraftUpdated(updated);
      setReviewState(createInitialReviewState(updated.content));
      setLastSavedAt(new Date());
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save resume edits.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6" data-testid="resume-structured-editor">
      {!packageMode ? (
      <SetupCard
        title="Edit resume details"
        description="Accept, edit, or omit generated bullets. Card-level edits update the preview below — click Save resume edits to persist to this draft."
      >
        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-sm"
          data-testid="resume-edit-save-status"
        >
          {hasUnsavedChanges ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              Unsaved changes
            </span>
          ) : isSaving ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Saving…
            </span>
          ) : formatLastSavedLabel(lastSavedAt) ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
              {formatLastSavedLabel(lastSavedAt)}
            </span>
          ) : (
            <span className="text-slate-600">No unsaved edits</span>
          )}
          <span className="text-slate-600">
            Draft status: <strong className="text-slate-900">{draft.status}</strong>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>Pending: {reviewCounts.pending}</span>
          <span>Accepted: {reviewCounts.accepted}</span>
          <span>Edited: {reviewCounts.edited}</span>
          <span>Omitted: {reviewCounts.rejected}</span>
        </div>

        <FinalResumeLayoutPreview
          layout={finalLayout}
          pageFit={pageFit}
          bodyFontPx={autoSettings.bodyFontPx}
          className="mt-4"
        />

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
      ) : null}

      <SetupCard
        title={packageMode ? "Edit resume text" : "Review generated sections"}
        description={
          packageMode
            ? "Structured fields mapped to the draft model. The A4 PDF preview stays read-only — save edits here."
            : "Accept, edit, or omit generated text. Click Save resume edits to persist."
        }
      >
        {!packageMode && draft.rationale ? (
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

        {draft.content.header.includeHeader ? (
          <ResumeDraftSectionCard title="Header / contact">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Full name
                <input
                  type="text"
                  value={headerDraft.fullName ?? ""}
                  onChange={(event) =>
                    setHeaderDraft((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className={`${formFieldClassName} mt-1`}
                />
              </label>
              <label className="text-sm text-slate-700">
                Location
                <input
                  type="text"
                  value={headerDraft.location ?? ""}
                  onChange={(event) =>
                    setHeaderDraft((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className={`${formFieldClassName} mt-1`}
                />
              </label>
              <label className="text-sm text-slate-700">
                Email
                <input
                  type="email"
                  value={headerDraft.email ?? ""}
                  onChange={(event) =>
                    setHeaderDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className={`${formFieldClassName} mt-1`}
                />
              </label>
              <label className="text-sm text-slate-700">
                Phone
                <input
                  type="text"
                  value={headerDraft.phone ?? ""}
                  onChange={(event) =>
                    setHeaderDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className={`${formFieldClassName} mt-1`}
                />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                LinkedIn
                <input
                  type="text"
                  value={headerDraft.linkedin ?? ""}
                  onChange={(event) =>
                    setHeaderDraft((current) => ({
                      ...current,
                      linkedin: event.target.value,
                    }))
                  }
                  className={`${formFieldClassName} mt-1`}
                />
              </label>
            </div>
          </ResumeDraftSectionCard>
        ) : null}

        {!packageMode && draft.content.globalRiskFlags.length > 0 ? (
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

        <div className="mt-6 space-y-6" data-testid="resume-structured-sections">
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

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => void handleSaveResumeEdits()}
            disabled={isSaving || !hasUnsavedChanges}
            className={primaryButtonClassName}
            data-action="save-resume-edits"
            aria-busy={isSaving}
          >
            {isSaving ? "Saving…" : "Save resume edits"}
          </button>
          <p className="text-xs text-slate-500">
            Saves text changes to this generated draft. Content edits downgrade export approval when
            the draft was previously approved.
          </p>
        </div>
      </SetupCard>
    </div>
  );
}
