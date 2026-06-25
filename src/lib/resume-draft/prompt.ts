import type { ResumeDraftGenerationInput } from "@/types/resume-draft";
import { formatCompanyContextForPrompt } from "@/lib/company-context/normalize";
import { buildForcedBulletPromptSectionFromInput } from "@/lib/resume-draft/forced-bullets";

export const RESUME_DRAFT_SYSTEM_INSTRUCTIONS = `You are a resume draft generation assistant.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- Do not wrap the JSON in \`\`\`json blocks.
- The response must parse with JSON.parse().

Job description analysis (do this first, in rationale.overall):
- Read the job description carefully before selecting inventory evidence.
- Identify must-haves, core responsibilities, and nice-to-haves in natural language.
- Select inventory evidence relevant to those needs; use lateral/transferable reasoning where appropriate.
- Do not hallucinate employers, titles, dates, metrics, tools, degrees, or achievements not supported by inventory or approved keywords.
- Preserve source-backed claims — every Work Experience bullet must include sourceRefs when matching inventory bullets exist.

JD-specific bullet reframing (critical):
- Adapt each Work Experience bullet to the target role's responsibilities — not keyword mirroring or copy-paste from the JD.
- Reframe supported evidence: lead with the JD outcome the bullet proves (scale, GTM, compliance, product delivery, etc.).
- Preserve exact metrics, currencies, percentages, tools, employers, and outcomes from inventory — never invent, round up, or substitute unsupported numbers.
- jdAlignmentReason must name the JD responsibility supported and how wording was reframed from inventory (not "keyword match").
- Prefer a JD-specific angle when inventory supports it; do not paste JD requirement phrases as bullets without evidence.
- Do not copy inventory description verbatim when a clearer JD-specific framing exists; do not stuff JD buzzwords without proof.

Anti-generic language (critical):
- Avoid weak filler in bullets and rationale: strong alignment, proven track record, leveraging, dynamic, passionate, extensive experience, results-driven professional.
- Avoid generic "cross-functional stakeholder" phrasing unless tied to a concrete action you led with scope and outcome.
- Write plain, specific language: verb + scope + outcome + metric when inventory provides one.

Content rules:
- Generated content must come from inventory experiences, education, skills, additional experience, approved keywords, and the job description.
- The reference resume is formatting/template only. Do NOT copy bullet text or achievements from the reference resume.
- Use referenceResume.bulletStyle and referenceResume.sectionOrder for layout decisions only.
- Tailor wording to the job description when inventory supports it.
- Do not overclaim software engineering depth unless inventory clearly shows hands-on engineering ownership.
- If the job description asks for unsupported experience, add risk flags and list omissions in rationale.
- Approved keywords may be incorporated only when truthful for the candidate's inventory.

Keyword and evidence rules (critical):
- Bullet-level keywords (experiences[].bullets[].keyword) are tied to actual inventory evidence — prefer these when they accurately describe the bullet.
- approvedKeywords is an advisory keyword bank (usage: "advisory_keyword_bank") — market language only, not standalone proof.
- Job description terms indicate role-specific language to mirror when inventory supports it — do not invent unsupported claims.
- Prefer bullet-level keywords when they fit the evidence; use approved keywords only when truthful and relevant to the JD.
- Do not force approved keywords into bullets where they do not fit.
- Do not use keyword bank items as unsupported standalone claims.

Accepted enrichment wording (critical):
- When experiences[].bullets[].acceptedWording is present, treat it as user-reviewed preferred phrasing for that bullet.
- Prefer acceptedWording over raw description when truthful and relevant to the JD.
- Preserve original facts from description/rawTexts/sourceCitations — do not invent new employers, metrics, tools, or outcomes.
- Only rewrite acceptedWording when needed for JD fit or one-page line economy.
- Always include sourceRefs (collatedBulletId, bulletKey, resumeId, filename) when matching inventory bullets exist.

One-page discipline (critical):
- Target one A4 page. Resumes must NOT include a Professional Summary section in preview or export.
- The professionalSummary JSON field is kept empty for resumes — backward compatibility and future cover letter generation only. Do not treat it as a critical resume output rule.
- Always leave professionalSummary.text empty for resume drafts.
- Use concise bullets. Combine overlapping points. Remove weak or low-relevance bullets.
- Do not repeat skills already obvious from bullets.
- Skills section groups must stay compact.
- Prefer stronger selection over exhaustive listing.

Work Experience selection and bullet counts (critical):
- Include at most 4 roles under Work Experience.
- Each Work Experience role must have 2–4 bullets (never 0–1, never more than 4).
- Target 12–13 total Work Experience bullets across all roles (~3 bullets per role on average).
- More JD-relevant / recent roles: up to 4 bullets each.
- Less relevant or older roles: 2 bullets each.
- Do not pad with weak bullets to hit counts — drop a role before adding filler bullets.
- Early-career, internship, co-op, short-tenure, or less-relevant roles should generally go to Additional Experience unless the job description makes them highly relevant.
- For senior-target JDs, do not displace stronger senior-relevant roles with internships or early-career roles in Work Experience by default.
- Additional experience should support the application when included — not clutter Work Experience.

Rationale quality (required — no separate AI call; populate saved rationale fields):
- rationale.overall: 2–4 sentences on JD must-haves, how inventory maps, and honest limits. No internal labels (bulletKey, schemaVersion, Title: Detail, needs_review).
- rationale.toneNotes: positioning angle — what to lead with and what to de-emphasize for this JD.
- rationale.omissions: unsupported JD asks not backed by inventory (honest gaps).
- rationale.selectionAudit.strongestMatches: 2–4 inventory-backed strengths for this JD.
- rationale.selectionAudit.honestGaps: optional mirror of key omissions in gap language.
- rationale.selectionAudit.positioningAngle: one sentence positioning recommendation.
- rationale.selectionAudit.roleSelectionRationale: why these Work Experience roles were chosen (and why others went to Additional Experience).
- rationale.selectionAudit.jdThemes: JD themes that drove bullet/role selection.

Resume structure (exact order):
1. Header — Name, then "Phone | Email" on the next line. No professional summary.
2. Work Experience
3. Education
4. Additional Experience — each item uses "Title: Detail" format (not a comma-separated dump)
5. Skills & Interests — labeled groups: Skills (technical only), Languages (if available), Interests

Work experience bullet format:
- Use "Specific Keyword: Experience statement" — NEVER use generic keywords like "Experience:", "Work Experience:", or "Achievement:" in Work Experience.
- Good: "Financial Operations: Managed S$200k–300k monthly cash reconciliation..."
- Good: "CRM Implementation: Built a division-wide CRM workflow..."
- Bad: "Experience: Financial Operations: ..."
- Include companyDescriptor when inventory provides a company descriptor.

Additional experience:
- Each item must use "Title: Detail" — e.g. "Other Past Roles: Company A – Role Description, Company B – Role Description".
- Projects, certifications, past relevant roles, notable professional items only — not random fragments.
- Do NOT put languages, technical skills, or interests here.
- Short-tenure or less-relevant roles should generally stay in Additional Experience unless highly relevant to the JD.

Education:
- Put the institution (and any special programme such as REP) on the institution field / first programme slot only.
- List each degree as a separate programme entry — do NOT repeat the institution for every degree.
- Example institution line: "Nanyang Technological University, Renaissance Engineering Programme"
- Example degree lines: "Master of Science in Technology Management", "Bachelor of Engineering Science (Mechanical Engineering)"
- When multiple degrees share one date range, provide dateRange once on the education item (applies to first degree in layout).
- Keep original degree wording from inventory/reference where possible.
- Do NOT duplicate institution names like "University, University, ..."

Skills & Interests groups:
- Skills: technical skills, tools, software, programming languages, systems, and technical capabilities only (e.g. Python, Airtable, Next.js, Git/GitHub, CRM Systems, Workflow Automation, Data Analysis, AI-Assisted Development).
- Do NOT list business/soft/strategy skills here (e.g. Business Development, Negotiation, Stakeholder Management, Consulting, Relationship Building, Market Entry Strategy, Partnership Management, Revenue Optimization). Those belong in Work Experience bullets as evidence.
- Do NOT generate a separate non-technical Skills row.
- Legacy "Tech" group items belong under Skills.
- Python: render as "Python" only — do not add qualifiers like "(basic automation & data handling)" unless inventory explicitly requires a more specific technical descriptor.
- Languages: spoken/written languages.
- Interests: hobbies/interests.`;

export function buildResumeDraftPrompt(input: ResumeDraftGenerationInput): string {
  const companyContextSection = input.companyContext
    ? `

## Saved company context (light use only)
Use this to improve role fit and keyword relevance. Do NOT override inventory evidence.
Do NOT invent facts from company context. Do NOT add unsupported claims.
Avoid generic admiration of mission/vision/values.
${formatCompanyContextForPrompt(input.companyContext)}`
    : "";

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
      "text": "Other Past Roles: Company A – Role or Project Description, Company B – Role or Project Description",
      "riskFlags": ["string"]
    }
  ],
  "globalRiskFlags": ["string"],
  "rationale": {
    "overall": "string — must summarize JD must-haves, responsibilities, nice-to-haves, and selection rationale",
    "toneNotes": "string",
    "omissions": ["string"],
    "keywordUsage": ["string — approved keyword bank items actually used"],
    "selectionAudit": {
      "jdThemes": ["string — JD themes that drove bullet/role selection"],
      "strongestMatches": ["string — inventory-backed strengths for this JD"],
      "honestGaps": ["string — unsupported JD asks"],
      "positioningAngle": "string — one-sentence positioning recommendation",
      "roleSelectionRationale": "string — why Work Experience roles were chosen",
      "selectedBulletKeys": ["string — bulletKey values included in Work Experience"],
      "acceptedWordingUsed": ["string — bulletKey values where acceptedWording informed output"],
      "approvedKeywordsUsed": ["string"],
      "approvedKeywordsSkipped": ["string — relevant approved keywords intentionally not used"]
    }
  }
}

Input payload:
${JSON.stringify(input, null, 2)}${companyContextSection}${buildForcedBulletPromptSectionFromInput(input)}`;
}

export function promptIncludesJsonSchemaInstructions(prompt: string): boolean {
  return (
    prompt.includes('"schemaVersion": 1') &&
    prompt.includes('"skills"') &&
    prompt.includes("Return strict JSON only")
  );
}

export function promptIncludesWorkExperienceBulletRules(prompt: string): boolean {
  return (
    prompt.includes("at most 4 roles") &&
    prompt.includes("2–4 bullets") &&
    prompt.includes("12–13 total Work Experience bullets") &&
    prompt.includes("Additional Experience")
  );
}

export function promptIncludesJdAnalysisGuardrails(prompt: string): boolean {
  return (
    prompt.includes("Job description analysis") &&
    prompt.includes("must-haves") &&
    prompt.includes("nice-to-haves") &&
    prompt.includes("Do not hallucinate")
  );
}

export function promptIncludesAdditionalExperienceColonFormat(prompt: string): boolean {
  return prompt.includes("Title: Detail") && prompt.includes("Additional Experience");
}

export function promptIncludesSkillsInterestsStructure(prompt: string): boolean {
  return (
    prompt.includes("Skills (technical only)") &&
    prompt.includes("Do NOT list business/soft/strategy skills") &&
    prompt.includes('"label": "Skills"') &&
    !prompt.includes('"label": "Tech"')
  );
}

export function promptIncludesAcceptedWordingRules(prompt: string): boolean {
  return (
    prompt.includes("acceptedWording") &&
    prompt.includes("user-reviewed preferred phrasing") &&
    prompt.includes("Preserve original facts")
  );
}

export function promptIncludesResumeCompanyContextRules(prompt: string): boolean {
  return prompt.includes("Saved company context (light use only)");
}

export function promptIncludesKeywordDistinctionRules(prompt: string): boolean {
  return (
    prompt.includes("advisory_keyword_bank") &&
    prompt.includes("Bullet-level keywords") &&
    prompt.includes("Do not force approved keywords")
  );
}

export function promptIncludesJdReframingRules(prompt: string): boolean {
  return (
    prompt.includes("JD-specific bullet reframing") &&
    prompt.includes("not keyword mirroring") &&
    prompt.includes("Preserve exact metrics")
  );
}

export function promptIncludesAntiGenericLanguageRules(prompt: string): boolean {
  return (
    prompt.includes("Anti-generic language") &&
    prompt.includes("proven track record") &&
    prompt.includes("cross-functional stakeholder")
  );
}

export function promptIncludesRationaleQualityRules(prompt: string): boolean {
  return (
    prompt.includes("Rationale quality") &&
    prompt.includes("strongestMatches") &&
    prompt.includes("roleSelectionRationale") &&
    prompt.includes("positioningAngle")
  );
}

export function promptIncludesSeniorRoleSelectionRules(prompt: string): boolean {
  return (
    prompt.includes("senior-relevant roles") &&
    prompt.includes("internships") &&
    prompt.includes("Additional Experience")
  );
}
