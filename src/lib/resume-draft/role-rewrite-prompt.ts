import type { ResumeDraftExperienceSection } from "@/types/resume-draft";
import type { TargetedRoleRewriteInventoryBullet } from "@/lib/resume-draft/targeted-role-rewrite";

export type ResumeRoleRewritePromptInput = {
  currentRole: ResumeDraftExperienceSection;
  forcedBulletKeys: readonly string[];
  inventoryBullets: readonly TargetedRoleRewriteInventoryBullet[];
  jobDescriptionText: string;
  targetRoleTitle?: string;
  bulletStyle?: "keyword_colon" | "plain";
};

export const RESUME_ROLE_REWRITE_SYSTEM_INSTRUCTIONS = `You rewrite Work Experience bullets for ONE role only.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().

Scope rules (critical):
- Rewrite ONLY the bullet list for the provided role.
- Preserve company, role title, location, dateRange, and companyDescriptor exactly as given.
- Output 2–4 bullets only for this role.
- Do not modify or mention other resume sections.

Evidence rules:
- Use inventory bullets and existing role bullets as evidence only.
- Forced inventory bullets MUST appear in the output with matching sourceRefs.bulletKey values.
- Do not invent employers, titles, dates, metrics, tools, or achievements unsupported by inventory or existing role bullets.
- Prefer acceptedWording when present and truthful.

Bullet format:
- Use "Specific Keyword: Experience statement" for Work Experience bullets.
- Never use generic keywords like "Experience:" or "Achievement:".

One-page discipline:
- Keep bullets concise. Prefer stronger selection over exhaustive listing.
- When tradeoffs are required, keep forced bullets and trim weaker non-forced evidence first.`;

export function buildResumeRoleRewritePrompt(input: ResumeRoleRewritePromptInput): string {
  const rolePayload = {
    company: input.currentRole.company,
    companyDescriptor: input.currentRole.companyDescriptor,
    role: input.currentRole.role,
    location: input.currentRole.location,
    dateRange: input.currentRole.dateRange,
    currentBullets: input.currentRole.bullets,
    forcedBulletKeys: input.forcedBulletKeys,
    inventoryBullets: input.inventoryBullets,
    bulletStyle: input.bulletStyle ?? "keyword_colon",
    jobDescription: {
      rawText: input.jobDescriptionText,
      roleTitle: input.targetRoleTitle,
    },
  };

  return `${RESUME_ROLE_REWRITE_SYSTEM_INSTRUCTIONS}

Return JSON with this exact shape:
{
  "bullets": [
    {
      "text": "Specific Keyword: Experience statement",
      "sourceRefs": [
        {
          "collatedBulletId": "string | null",
          "bulletKey": "string | null",
          "resumeId": "string | null",
          "filename": "string | null"
        }
      ],
      "jdAlignmentReason": "string",
      "confidence": "high | medium | low",
      "riskFlags": ["string"]
    }
  ],
  "notes": "string | null"
}

Role rewrite input:
${JSON.stringify(rolePayload, null, 2)}`;
}

export function promptIncludesRoleRewriteScopeRules(prompt: string): boolean {
  return (
    prompt.includes("Rewrite ONLY the bullet list") &&
    prompt.includes("Forced inventory bullets MUST appear") &&
    prompt.includes("Output 2–4 bullets only")
  );
}
