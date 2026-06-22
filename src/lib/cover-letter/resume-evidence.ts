import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export function buildResumeEvidenceSpine(draft: GeneratedResumeDraftRecord): string {
  const lines: string[] = [];

  if (draft.content.targetRoleTitle?.trim()) {
    lines.push(`Target role: ${draft.content.targetRoleTitle.trim()}`);
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
