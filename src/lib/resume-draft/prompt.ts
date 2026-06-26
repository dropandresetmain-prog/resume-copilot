import type { ResumeDraftGenerationInput } from "@/types/resume-draft";
import { formatCompanyContextForResumePrompt } from "@/lib/company-context/normalize";
import { buildForcedBulletPromptSectionFromInput } from "@/lib/resume-draft/forced-bullets";
import { serializeResumeDraftPromptPayload } from "@/lib/resume-draft/prompt-payload";

export const RESUME_DRAFT_SYSTEM_INSTRUCTIONS = `You are a resume draft generation assistant.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().

Job description analysis (do this first, in rationale.overall):
- Identify must-haves, core responsibilities, and nice-to-haves.
- Select inventory evidence relevant to those needs; use lateral/transferable reasoning where appropriate.
- Do not hallucinate employers, titles, dates, metrics, tools, degrees, or achievements not supported by inventory or approved keywords.
- Preserve source-backed claims — every Work Experience bullet must include sourceRefs when matching inventory bullets exist.

JD-specific bullet reframing (critical):
- Adapt each Work Experience bullet to the target role's responsibilities — not keyword mirroring or copy-paste from the JD.
- Reframe supported evidence: lead with the JD outcome the bullet proves (scale, GTM, compliance, product delivery, etc.).
- Preserve exact metrics, currencies, percentages, tools, employers, and outcomes from inventory — never invent, round up, or substitute unsupported numbers.
- jdAlignmentReason must name the JD responsibility supported and how wording was reframed from inventory (not "keyword match").
- Do not copy inventory description verbatim when a clearer JD-specific framing exists; do not stuff JD buzzwords without proof.

Anti-generic language (critical):
- Avoid weak filler: strong alignment, proven track record, leveraging, dynamic, passionate, extensive experience, results-driven professional.
- Avoid generic "cross-functional stakeholder" phrasing unless tied to a concrete action you led with scope and outcome.
- Write plain, specific language: verb + scope + outcome + metric when inventory provides one.

Content rules:
- Generated content must come from inventory experiences, education, skills, additional experience, approved keywords, and the job description.
- The reference resume is formatting/template only. Do NOT copy bullet text or achievements from the reference resume.
- Use referenceResume.bulletStyle and referenceResume.sectionOrder for layout decisions only.
- Do not overclaim software engineering depth unless inventory clearly shows hands-on engineering ownership.
- If the job description asks for unsupported experience, add risk flags and list omissions in rationale.
- Approved keywords may be incorporated only when truthful for the candidate's inventory.

Keyword and evidence rules (critical):
- Bullet-level keywords (experiences[].bullets[].keyword) are tied to actual inventory evidence — prefer these when they accurately describe the bullet.
- approvedKeywords is an advisory keyword bank (usage: "advisory_keyword_bank") — market language only, not standalone proof.
- Do not force approved keywords into bullets where they do not fit.
- Do not use keyword bank items as unsupported standalone claims.

Accepted enrichment wording (critical):
- When experiences[].bullets[].acceptedWording is present, treat it as user-reviewed preferred phrasing for that bullet.
- Prefer acceptedWording over raw description when truthful and relevant to the JD.
- Preserve original facts from description/rawTexts/sourceCitations — do not invent new employers, metrics, tools, or outcomes.
- Always include sourceRefs (collatedBulletId, bulletKey, resumeId, filename) when matching inventory bullets exist.

One-page discipline:
- Target one A4 page. Leave professionalSummary.text empty. No Professional Summary on the resume.
- Use concise bullets. Prefer stronger selection over exhaustive listing. Skills groups stay compact.

Work Experience selection (structure enforced in output validation):
- at most 4 roles; 2–4 bullets per role; target 12–13 total Work Experience bullets.
- More JD-relevant / recent roles: up to 4 bullets each; less relevant roles: 2 bullets.
- Early-career, internship, co-op, or short-tenure roles → Additional Experience unless the JD makes them highly relevant.
- For senior-target JDs, do not displace stronger senior-relevant roles with internships by default.

Rationale quality (required — populate saved rationale fields):
- rationale.overall: 2–4 sentences on JD must-haves, how inventory maps, and honest limits. No internal labels.
- rationale.toneNotes: positioning angle — what to lead with and what to de-emphasize.
- rationale.omissions / selectionAudit.honestGaps: unsupported JD asks.
- selectionAudit.strongestMatches, positioningAngle, roleSelectionRationale, jdThemes: inventory-backed selection rationale.

Resume structure: Header (no summary) → Work Experience → Education → Additional Experience ("Title: Detail") → Skills & Interests (Skills technical only, Languages, Interests).
Work Experience bullets: "Specific Keyword: Experience statement" — never generic keywords like "Experience:" or "Achievement:".
Skills: technical/tools only — not business/soft skills (those belong in Work Experience evidence).`;

function buildResumeCompanyContextSection(context: NonNullable<ResumeDraftGenerationInput["companyContext"]>): string {
  return `

## Company context (positioning and framing only)
Use company context to improve positioning, relevance, and rationale — especially likelyHiringPriorities and suggestedNarrativeAngles.
- Frame which inventory evidence to lead with and how to angle bullets for this company and role.
- Never turn company facts into candidate claims. Every candidate claim must remain inventory-backed.
- Do not add generic admiration of mission, vision, or values.
- Do not invent facts from company context. Respect confidence and limitations.
${formatCompanyContextForResumePrompt(context)}`;
}

export function buildResumeDraftPrompt(input: ResumeDraftGenerationInput): string {
  const companyContextSection = input.companyContext
    ? buildResumeCompanyContextSection(input.companyContext)
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
    "overall": "string",
    "toneNotes": "string",
    "omissions": ["string"],
    "keywordUsage": ["string"],
    "selectionAudit": {
      "jdThemes": ["string"],
      "strongestMatches": ["string"],
      "honestGaps": ["string"],
      "positioningAngle": "string",
      "roleSelectionRationale": "string",
      "selectedBulletKeys": ["string"],
      "acceptedWordingUsed": ["string"],
      "approvedKeywordsUsed": ["string"],
      "approvedKeywordsSkipped": ["string"]
    }
  }
}

Input payload:
${serializeResumeDraftPromptPayload(input)}${companyContextSection}${buildForcedBulletPromptSectionFromInput(input)}`;
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
    prompt.includes("Skills technical only") &&
    prompt.includes("technical/tools only") &&
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
  return (
    prompt.includes("Company context (positioning and framing only)") &&
    prompt.includes("likelyHiringPriorities") &&
    prompt.includes("inventory-backed")
  );
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

export function promptIncludesSourceRefsRules(prompt: string): boolean {
  return (
    prompt.includes("sourceRefs") &&
    prompt.includes("source-backed claims")
  );
}

export function promptUsesCompactJsonPayload(prompt: string): boolean {
  const marker = "Input payload:\n";
  const start = prompt.indexOf(marker);
  if (start < 0) {
    return false;
  }
  const payload = prompt.slice(start + marker.length);
  const end = payload.indexOf("\n\n## ");
  const jsonBlock = end >= 0 ? payload.slice(0, end) : payload.split("\n")[0] ?? "";
  return !jsonBlock.includes("\n  ");
}
