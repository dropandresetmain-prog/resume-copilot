import type { ResumeDraftExperienceSection } from "@/types/resume-draft";

export type ResumeSummaryCustomRevisionPromptInput = {
  currentSummary: string;
  customInstruction: string;
  jobDescriptionText: string;
  targetRoleTitle?: string;
};

export type ResumeRoleCustomRevisionPromptInput = {
  currentRole: ResumeDraftExperienceSection;
  customInstruction: string;
  jobDescriptionText: string;
  targetRoleTitle?: string;
  bulletStyle?: "keyword_colon" | "plain";
};

export type ResumeSingleBulletRevisionPromptTarget = {
  roleIndex: number;
  bulletIndex: number;
  company: string;
  role: string;
  currentText: string;
  customInstruction?: string;
};

export type ResumeSingleBulletRevisionPromptInput = {
  targets: ResumeSingleBulletRevisionPromptTarget[];
  jobDescriptionText: string;
  targetRoleTitle?: string;
  bulletStyle?: "keyword_colon" | "plain";
};

export const RESUME_SUMMARY_CUSTOM_REVISION_INSTRUCTIONS = `You revise ONLY the professional summary paragraph for a resume draft.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().

Scope rules (critical):
- Rewrite ONLY the professional summary text.
- Do NOT modify work experience bullets, skills, education, or header fields.
- Do not invent employers, titles, dates, metrics, tools, or achievements unsupported by the current summary or job description context.
- Keep the summary concise (2–4 sentences).`;

export const RESUME_ROLE_CUSTOM_REVISION_INSTRUCTIONS = `You revise Work Experience bullets for ONE role only, following a custom user instruction.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().

Scope rules (critical):
- Rewrite ONLY the bullet list for the provided role.
- Preserve company, role title, location, dateRange, and companyDescriptor exactly as given.
- Output 2–4 bullets only for this role.
- Do not modify or mention other resume sections.

Evidence rules:
- Use existing role bullets as evidence only.
- Preserve sourceRefs.bulletKey values from the current bullets when the evidence still applies.
- Do not invent employers, titles, dates, metrics, tools, or achievements unsupported by existing role bullets.

Bullet format:
- Use "Specific Keyword: Experience statement" for Work Experience bullets unless bulletStyle is plain.
- Never use generic keywords like "Experience:" or "Achievement:".

One-page discipline:
- Keep bullets concise. Prefer stronger selection over exhaustive listing.`;

export const RESUME_SINGLE_BULLET_REVISION_INSTRUCTIONS = `You revise specific individual Work Experience bullets the user selected to replace.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().

Scope rules (critical):
- Revise ONLY the bullets listed in "targets" — one revised statement per target.
- Return exactly one entry per target, echoing its roleIndex and bulletIndex.
- Do NOT add, remove, reorder, or merge bullets. Do NOT touch any other bullet, role, or section.
- Preserve the original meaning and the underlying achievement of each bullet — improve phrasing/alignment, do not invent new facts, employers, titles, dates, metrics, or tools.

Bullet format:
- Use "Specific Keyword: Experience statement" unless bulletStyle is plain.
- Never use generic keywords like "Experience:" or "Achievement:".

One-page discipline:
- Keep each revised bullet concise (single line where possible).`;

export function buildResumeSingleBulletRevisionPrompt(
  input: ResumeSingleBulletRevisionPromptInput,
): string {
  const payload = {
    bulletStyle: input.bulletStyle ?? "keyword_colon",
    jobDescription: {
      rawText: input.jobDescriptionText,
      roleTitle: input.targetRoleTitle,
    },
    targets: input.targets.map((target) => ({
      roleIndex: target.roleIndex,
      bulletIndex: target.bulletIndex,
      company: target.company,
      role: target.role,
      currentText: target.currentText,
      customInstruction: target.customInstruction?.trim() || undefined,
    })),
  };

  return `${RESUME_SINGLE_BULLET_REVISION_INSTRUCTIONS}

Return JSON with this exact shape:
{
  "bullets": [
    { "roleIndex": number, "bulletIndex": number, "text": "Specific Keyword: Experience statement" }
  ],
  "warnings": string[]
}

Single-bullet revision input:
${JSON.stringify(payload, null, 2)}`;
}

export function promptIncludesSingleBulletRevisionScope(prompt: string): boolean {
  return (
    prompt.includes("revise specific individual Work Experience bullets") &&
    prompt.includes("Revise ONLY the bullets listed in")
  );
}

export function buildResumeSummaryCustomRevisionPrompt(
  input: ResumeSummaryCustomRevisionPromptInput,
): string {
  const payload = {
    currentSummary: input.currentSummary,
    customInstruction: input.customInstruction.trim(),
    jobDescription: {
      rawText: input.jobDescriptionText,
      roleTitle: input.targetRoleTitle,
    },
  };

  return `${RESUME_SUMMARY_CUSTOM_REVISION_INSTRUCTIONS}

Return JSON with this exact shape:
{
  "text": string,
  "warnings": string[]
}

Summary revision input:
${JSON.stringify(payload, null, 2)}`;
}

export function buildResumeRoleCustomRevisionPrompt(
  input: ResumeRoleCustomRevisionPromptInput,
): string {
  const rolePayload = {
    company: input.currentRole.company,
    companyDescriptor: input.currentRole.companyDescriptor,
    role: input.currentRole.role,
    location: input.currentRole.location,
    dateRange: input.currentRole.dateRange,
    currentBullets: input.currentRole.bullets,
    customInstruction: input.customInstruction.trim(),
    bulletStyle: input.bulletStyle ?? "keyword_colon",
    jobDescription: {
      rawText: input.jobDescriptionText,
      roleTitle: input.targetRoleTitle,
    },
  };

  return `${RESUME_ROLE_CUSTOM_REVISION_INSTRUCTIONS}

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
  "warnings": string[]
}

Role custom revision input:
${JSON.stringify(rolePayload, null, 2)}`;
}

export function promptIncludesSummaryCustomRevisionScope(prompt: string): boolean {
  return (
    prompt.includes("revise ONLY the professional summary") &&
    prompt.includes("Do NOT modify work experience bullets")
  );
}

export function promptIncludesRoleCustomRevisionScope(prompt: string): boolean {
  return (
    prompt.includes("following a custom user instruction") &&
    prompt.includes("Rewrite ONLY the bullet list") &&
    prompt.includes("customInstruction")
  );
}
