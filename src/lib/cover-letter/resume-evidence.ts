import {
  documentStoryRankingMethodology,
  formatRankedExperiencesForPrompt,
  rankExperiencesForRole,
  type StoryRankingInput,
} from "@/lib/cover-letter/story-ranking";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

/** Resume draft bullets for consistency — not the primary cover letter evidence universe. */
export function buildResumeConsistencyContext(draft: GeneratedResumeDraftRecord): string {
  const lines: string[] = [
    "## Resume draft (consistency reference only)",
    "Use this section to keep cover letter claims aligned with what appears on the generated resume.",
    "Do not treat the resume draft as the only evidence source — prefer inventory story spine proof.",
  ];

  if (draft.content.targetRoleTitle?.trim()) {
    lines.push(`Target role on resume: ${draft.content.targetRoleTitle.trim()}`);
  }

  for (const experience of draft.content.experience) {
    const header = [experience.role, experience.company, experience.dateRange]
      .filter(Boolean)
      .join(" · ");
    if (header) {
      lines.push(`\n${header}`);
    }
    for (const bullet of experience.bullets) {
      if (bullet.text?.trim()) {
        lines.push(`- ${bullet.text.trim()}`);
      }
    }
  }

  if (draft.content.additionalExperience.length > 0) {
    lines.push("\nAdditional experience on resume:");
    for (const item of draft.content.additionalExperience) {
      if (item.text?.trim()) {
        lines.push(`- ${item.text.trim()}`);
      }
    }
  }

  return lines.join("\n").trim();
}

export function buildResumeEvidenceSpine(
  draft: GeneratedResumeDraftRecord,
  rankingInput?: StoryRankingInput,
): string {
  const lines: string[] = [];

  if (draft.content.targetRoleTitle?.trim()) {
    lines.push(`Target role: ${draft.content.targetRoleTitle.trim()}`);
  }

  if (rankingInput?.jobDescriptionText) {
    lines.push("\n## Ranked resume evidence (most role-relevant first)");
    lines.push(documentStoryRankingMethodology());
    const ranked = rankExperiencesForRole(draft.content.experience, rankingInput);
    lines.push(formatRankedExperiencesForPrompt(ranked));
  } else {
    for (const experience of draft.content.experience) {
      const header = [experience.role, experience.company, experience.dateRange]
        .filter(Boolean)
        .join(" · ");
      if (header) {
        lines.push(`\n${header}`);
      }
      for (const bullet of experience.bullets) {
        if (bullet.text?.trim()) {
          lines.push(`- ${bullet.text.trim()}`);
        }
      }
    }
  }

  if (draft.content.additionalExperience.length > 0) {
    lines.push("\nAdditional experience:");
    for (const item of draft.content.additionalExperience) {
      if (item.text?.trim()) {
        lines.push(`- ${item.text.trim()}`);
      }
    }
  }

  return lines.join("\n").trim();
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
