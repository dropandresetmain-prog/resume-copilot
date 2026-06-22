import { formatKeywordBullet } from "@/lib/resume-draft/layout";
import { repairBulletText } from "@/lib/resume-draft/keyword-repair";
import {
  parseResumeRoleRewriteJson,
  type ResumeRoleRewriteParseError,
} from "@/lib/resume-draft/role-rewrite-parse";
import { buildResumeRoleRewritePrompt } from "@/lib/resume-draft/role-rewrite-prompt";
import type { ResumeRoleRewritePromptInput } from "@/lib/resume-draft/role-rewrite-prompt";
import type { ResumeDraftExperienceBullet } from "@/types/resume-draft";

export type ResumeRoleRewriteResult = {
  bullets: ResumeDraftExperienceBullet[];
  notes?: string;
};

export function rewriteMockResumeRole(
  input: ResumeRoleRewritePromptInput,
): ResumeRoleRewriteResult {
  const forcedSet = new Set(input.forcedBulletKeys);
  const bullets: ResumeDraftExperienceBullet[] = [];

  for (const inventoryBullet of input.inventoryBullets) {
    if (!forcedSet.has(inventoryBullet.bulletKey)) {
      continue;
    }
    const statement = inventoryBullet.acceptedWording?.trim() || inventoryBullet.description.trim();
    bullets.push({
      text: repairBulletText(
        formatKeywordBullet(inventoryBullet.keyword ?? "Operations", statement),
      ),
      sourceRefs: [
        {
          bulletKey: inventoryBullet.bulletKey,
          collatedBulletId: inventoryBullet.collatedBulletId,
        },
      ],
      jdAlignmentReason: "Forced inventory evidence included in targeted role rewrite.",
      confidence: "high",
      riskFlags: [],
    });
  }

  for (const bullet of input.currentRole.bullets) {
    if (bullets.length >= 4) {
      break;
    }
    const key = bullet.sourceRefs[0]?.bulletKey;
    if (key && forcedSet.has(key)) {
      continue;
    }
    bullets.push(bullet);
  }

  while (bullets.length < 2 && input.currentRole.bullets.length > 0) {
    const fallback = input.currentRole.bullets[bullets.length];
    if (!fallback || bullets.includes(fallback)) {
      break;
    }
    bullets.push(fallback);
  }

  return {
    bullets: bullets.slice(0, 4),
    notes: "Mock targeted role rewrite.",
  };
}

export { ResumeRoleRewriteParseError, parseResumeRoleRewriteJson, buildResumeRoleRewritePrompt };
