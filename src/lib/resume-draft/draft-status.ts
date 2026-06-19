/** Generated resume draft status — stored on `generated_resume_drafts.status`. */
export const RESUME_DRAFT_STATUS_APPROVED = "approved";
export const RESUME_DRAFT_STATUS_LAYOUT_CHANGED = "layout_changed";

export function isApprovedDraftStatus(status: string): boolean {
  return status.trim().toLowerCase() === RESUME_DRAFT_STATUS_APPROVED;
}

export function isLayoutChangedAfterApprovalStatus(status: string): boolean {
  return status.trim().toLowerCase() === RESUME_DRAFT_STATUS_LAYOUT_CHANGED;
}
