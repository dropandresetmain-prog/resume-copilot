import type { ResumeDraftGenerationInput } from "@/types/resume-draft";

export const RESUME_DRAFT_SYSTEM_INSTRUCTIONS = `You are a resume draft generation assistant.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- Do not wrap the JSON in \`\`\`json blocks.
- The response must parse with JSON.parse().

Content rules:
- Do not invent employers, titles, dates, metrics, tools, degrees, or achievements not supported by the provided inventory, reference resume, job description, or approved keywords.
- Use only facts from the provided input payload.
- Tailor wording to the job description when the inventory supports it.
- Preserve the tone and positioning of the reference resume excerpt.
- Do not overclaim software engineering depth. Frame technical work accurately as product, system, or AI-assisted development unless the inventory clearly shows hands-on engineering ownership.
- If the job description asks for unsupported experience, add risk flags instead of inventing bullets.
- Every experience bullet must include sourceRefs when matching inventory bullets exist.
- Include rationale and omissions for unsupported JD requirements.
- Approved keywords may be incorporated only when truthful for the candidate's inventory.
- Omit a contact/header block unless the reference resume excerpt contains contact details.`;

export function buildResumeDraftPrompt(input: ResumeDraftGenerationInput): string {
  return `${RESUME_DRAFT_SYSTEM_INSTRUCTIONS}

Generate a tailored resume draft and return JSON with this exact shape:
{
  "schemaVersion": 1,
  "targetRoleTitle": "string",
  "header": {
    "fullName": "string | null",
    "location": "string | null",
    "email": "string | null",
    "phone": "string | null",
    "linkedin": "string | null",
    "includeHeader": true,
    "notes": "string | null"
  },
  "professionalSummary": {
    "text": "string",
    "jdAlignment": ["string"],
    "riskFlags": ["string"]
  },
  "skills": {
    "groups": [{ "label": "string", "items": ["string"] }],
    "jdAlignment": ["string"],
    "riskFlags": ["string"]
  },
  "experience": [
    {
      "company": "string",
      "role": "string",
      "location": "string | null",
      "dateRange": "string | null",
      "bullets": [
        {
          "text": "string",
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
      "riskFlags": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "programmes": ["string"],
      "dateRange": "string | null",
      "bullets": ["string"],
      "riskFlags": ["string"]
    }
  ],
  "additionalExperience": [
    {
      "category": "string | null",
      "text": "string",
      "riskFlags": ["string"]
    }
  ],
  "globalRiskFlags": ["string"],
  "rationale": {
    "overall": "string",
    "toneNotes": "string",
    "omissions": ["string"],
    "keywordUsage": ["string"]
  }
}

Input payload:
${JSON.stringify(input, null, 2)}`;
}

export function promptIncludesJsonSchemaInstructions(prompt: string): boolean {
  return (
    prompt.includes('"schemaVersion": 1') &&
    prompt.includes('"professionalSummary"') &&
    prompt.includes("Return strict JSON only")
  );
}
