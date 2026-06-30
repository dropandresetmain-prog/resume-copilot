import { sortReverseChronological } from "@/lib/resume-draft/layout";
import type { ResumeDraftContent } from "@/types/resume-draft";

export type ResumeExperienceDisplayEntry = {
  experience: ResumeDraftContent["experience"][number];
  originalIndex: number;
};

/** Sorts only the Text-view projection; mutation callers keep the original content index. */
export function buildResumeExperienceDisplayEntries(
  experiences: ResumeDraftContent["experience"],
  referenceDate?: Date,
): ResumeExperienceDisplayEntry[] {
  return sortReverseChronological(
    experiences.map((experience, originalIndex) => ({ experience, originalIndex })),
    (entry) => entry.experience.dateRange,
    referenceDate,
  );
}

export function updateResumeSkillGroupItems(
  content: ResumeDraftContent,
  groupIndex: number,
  items: string[],
): ResumeDraftContent {
  return {
    ...content,
    skills: {
      ...content.skills,
      groups: content.skills.groups.map((group, index) =>
        index === groupIndex ? { ...group, items: [...items] } : group,
      ),
    },
  };
}

export function isResumeStageTargetCurrent(
  content: ResumeDraftContent,
  target: { roleIndex: number; bulletIndex: number; originalText: string },
): boolean {
  return (
    content.experience[target.roleIndex]?.bullets[target.bulletIndex]?.text ===
    target.originalText
  );
}
