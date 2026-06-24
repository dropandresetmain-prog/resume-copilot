import {
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
  RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
} from "@/lib/resume-draft/draft-status";
import type { ResumeDraftContent } from "@/types/resume-draft";

/** Remove generated bullets whose sourceRefs include any of the given inventory keys. */
export function removeBulletsFromDraftBySourceKeys(
  content: ResumeDraftContent,
  sourceKeys: readonly string[],
): ResumeDraftContent {
  const keySet = new Set(sourceKeys);

  return {
    ...content,
    experience: content.experience.map((experience) => ({
      ...experience,
      bullets: experience.bullets.filter((bullet) => {
        const refs = bullet.sourceRefs
          .map((ref) => ref.bulletKey?.trim())
          .filter((key): key is string => Boolean(key));
        if (refs.length === 0) {
          return true;
        }
        return !refs.some((key) => keySet.has(key));
      }),
    })),
    serverPdfValidation: undefined,
  };
}

export function resolveDraftStatusAfterContentEdit(currentStatus: string): string {
  if (
    isApprovedDraftStatus(currentStatus) ||
    isLayoutChangedAfterApprovalStatus(currentStatus)
  ) {
    return RESUME_DRAFT_STATUS_LAYOUT_CHANGED;
  }
  return currentStatus;
}
