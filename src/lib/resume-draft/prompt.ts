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

One-page discipline (critical):
- Target one A4 page. Resumes must NOT include a Professional Summary section.
- Professional Summary is for future cover letter generation only — always leave professionalSummary.text empty.
- Current/primary roles: 2–3 bullets; max 4 only when highly relevant.
- Older/less relevant roles: 1–2 bullets.
- Use concise bullets. Combine overlapping points. Remove weak or low-relevance bullets.
- Do not repeat skills already obvious from bullets.
- Additional Experience: one compact comma-separated line.
- Skills section groups must stay compact.
- Prefer stronger selection over exhaustive listing.

Resume structure (exact order):
1. Header — Name, then "Phone | Email" on the next line. No professional summary.
2. Work Experience
3. Education
4. Additional Experience — compact comma-separated line(s)
5. Skills & Interests — labeled groups: Tech, Skills, Languages (if available), Interests

Work experience bullet format:
- Use "Specific Keyword: Experience statement" — NEVER use generic keywords like "Experience:", "Work Experience:", or "Achievement:" in Work Experience.
- Good: "Financial Operations: Managed S$200k–300k monthly cash reconciliation..."
- Good: "CRM Implementation: Built a division-wide CRM workflow..."
- Bad: "Experience: Financial Operations: ..."
- Include companyDescriptor when inventory provides a company descriptor.

Additional experience:
- Projects, certifications, past relevant roles, notable professional items only.
- Do NOT put languages, interests, or skills here.

Education:
- Put the institution (and any special programme such as REP) on the institution field / first programme slot only.
- List each degree as a separate programme entry — do NOT repeat the institution for every degree.
- Example institution line: "Nanyang Technological University, Renaissance Engineering Programme"
- Example degree lines: "Master of Science in Technology Management", "Bachelor of Engineering Science (Mechanical Engineering)"
- When multiple degrees share one date range, provide dateRange once on the education item (applies to first degree in layout).
- Keep original degree wording from inventory/reference where possible.
- Do NOT duplicate institution names like "University, University, ..."

Skills & Interests groups:
- Tech: programming, IT, AI/tooling, software, technical tools.
- Skills: business/non-technical skills; avoid repeating keywords already dominant in work bullets.
- Languages: spoken/written languages.
- Interests: hobbies/interests.`;

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
      { "label": "Tech", "items": ["string"] },
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
