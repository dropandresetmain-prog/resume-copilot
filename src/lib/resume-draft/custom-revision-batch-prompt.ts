import type { ResumeDraftContent } from "@/types/resume-draft";
import type { ResumeRevisionQueueItem } from "@/types/resume-draft";

export type ResumeBatchRevisionPromptInput = {
  content: ResumeDraftContent;
  queue: readonly ResumeRevisionQueueItem[];
  jobDescriptionText: string;
  targetRoleTitle?: string;
  bulletStyle?: "keyword_colon" | "plain";
};

export const RESUME_BATCH_REVISION_INSTRUCTIONS = `You revise ONLY the resume sections listed in the revision queue.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().
- Apply EVERY queued revision in one response.

Scope rules (critical):
- Rewrite ONLY sections that appear in the queue.
- Do NOT modify skills, education, header, or roles not listed in the queue.
- Do not invent employers, titles, dates, metrics, tools, or achievements unsupported by the provided current content.
- Preserve company, role title, location, dateRange, and companyDescriptor for each role candidate exactly as given in input.
- For each role candidate, output 2–4 bullets only.
- Preserve sourceRefs.bulletKey values from current bullets when evidence still applies.
- Professional summary: 2–4 sentences, text only.

Bullet format:
- Use "Specific Keyword: Experience statement" unless bulletStyle is plain.
- Never use generic keywords like "Experience:" or "Achievement:".`;

export function buildResumeBatchRevisionPrompt(input: ResumeBatchRevisionPromptInput): string {
  const summaryItem = input.queue.find((item) => item.scope === "professional_summary");
  const roleItems = input.queue.filter((item) => item.scope === "selected_role");

  const payload = {
    bulletStyle: input.bulletStyle ?? "keyword_colon",
    jobDescription: {
      rawText: input.jobDescriptionText,
      roleTitle: input.targetRoleTitle,
    },
    currentSummary: input.content.professionalSummary.text,
    queuedRevisions: input.queue.map((item) =>
      item.scope === "professional_summary"
        ? {
            queueItemId: item.id,
            scope: item.scope,
            customInstruction: item.customInstruction.trim(),
          }
        : {
            queueItemId: item.id,
            scope: item.scope,
            roleIndex: item.roleIndex,
            company: input.content.experience[item.roleIndex]?.company,
            role: input.content.experience[item.roleIndex]?.role,
            customInstruction: item.customInstruction.trim(),
            currentBullets: input.content.experience[item.roleIndex]?.bullets,
          },
    ),
    summaryQueued: Boolean(summaryItem),
    roleIndicesQueued: roleItems.map((item) => item.roleIndex),
  };

  return `${RESUME_BATCH_REVISION_INSTRUCTIONS}

Return JSON with this exact shape:
{
  "summaryCandidate": { "text": string } | null,
  "roleCandidates": [
    {
      "roleIndex": number,
      "company": string,
      "role": string,
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
      ]
    }
  ],
  "warnings": string[]
}

Rules for output:
- Include summaryCandidate only when a summary revision was queued; otherwise null.
- Include one roleCandidates entry per queued role, matching roleIndex exactly.
- Do not include roleCandidates for roles not in the queue.
- Put per-section issues in warnings instead of inventing content.

Batch revision input:
${JSON.stringify(payload, null, 2)}`;
}

export function promptIncludesBatchRevisionScope(prompt: string): boolean {
  return (
    prompt.includes("revision queue") &&
    prompt.includes("summaryCandidate") &&
    prompt.includes("roleCandidates") &&
    prompt.includes("Apply EVERY queued revision")
  );
}
