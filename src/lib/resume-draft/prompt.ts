import type { ResumeDraftGenerationInput } from "@/types/resume-draft";

export const RESUME_DRAFT_SYSTEM_INSTRUCTIONS = `You are a resume draft generation assistant.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- Do not wrap the JSON in \`\`\`json blocks.
- The response must parse with JSON.parse().

Content rules:
- Generated content must come from inventory experiences, education, skills, additional experience, approved keywords, and the job description.
- The reference resume is formatting/template only. Do NOT copy bullet text or achievements from the reference resume.
- Use referenceResume.bulletStyle and referenceResume.sectionOrder for layout decisions only.
- Do not invent employers, titles, dates, metrics, tools, degrees, or achievements not supported by inventory or approved keywords.
- Tailor wording to the job description when inventory supports it.
- Do not overclaim software engineering depth unless inventory clearly shows hands-on engineering ownership.
- If the job description asks for unsupported experience, add risk flags and list omissions in rationale.
- Every experience bullet must include sourceRefs when matching inventory bullets exist.
- Approved keywords may be incorporated only when truthful for the candidate's inventory.
- Aim for one A4 page: prefer 2–4 strong, job-relevant bullets per role; avoid filler bullets.
- Do not auto-delete inventory content — omit only when unsupported, and note omissions in rationale.

Resume structure (exact order):
1. Header — Name, then "Phone | Email" on the next line. No professional summary.
2. Work Experience
3. Education
4. Additional Experience — compact comma-separated line(s) for projects, certifications, past roles, extracurriculars
5. Skills & Interests — labeled groups: Skills, Languages (if available), Interests

Work experience bullet format:
- Use "Keyword: Experience statement" (keyword colon space statement).
- Example: "Strategy: Supported 50+ companies with market entry initiatives across multiple regions."
- Include companyDescriptor when inventory provides a company descriptor.
- Preview renders bullets with visible bullet markers and underlined "Keyword:" labels.

Additional experience:
- Include projects, certifications, past relevant roles, and notable professional items.
- Do NOT put languages, interests, or technical skills here — those belong in Skills & Interests.
- Combine into compact comma-separated phrases, e.g. "Advanced Open Water Diver, Former Band Vocalist".

Skills & Interests:
- Skills group: comma-separated skill phrases.
- Languages group: comma-separated languages when inventory has them.
- Interests group: comma-separated interests (required when inventory has interests).`;

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
    "text": "",
    "jdAlignment": [],
    "riskFlags": []
  },
  "skills": {
    "groups": [
      { "label": "Skills", "items": ["string"] },
      { "label": "Languages", "items": ["string"] },
      { "label": "Interests", "items": ["string"] }
    ],
    "jdAlignment": ["string"],
    "riskFlags": ["string"]
  },
  "experience": [
    {
      "company": "string",
      "companyDescriptor": "string | null",
      "role": "string",
      "location": "string | null",
      "dateRange": "string | null",
      "bullets": [
        {
          "text": "Keyword: Experience statement",
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
      "location": "string | null",
      "programmes": ["string"],
      "dateRange": "string | null",
      "bullets": ["Achievement: optional achievement text"],
      "riskFlags": ["string"]
    }
  ],
  "additionalExperience": [
    {
      "category": "Additional Experience",
      "text": "compact comma-separated line",
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
    prompt.includes('"skills"') &&
    prompt.includes("Return strict JSON only")
  );
}
