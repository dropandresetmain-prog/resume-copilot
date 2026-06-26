import type { CoverLetterGenerationInput } from "@/types/cover-letter-draft";
import { COVER_LETTER_BANNED_PHRASES } from "@/lib/cover-letter/banned-phrases";
import { formatCompanyContextForPrompt } from "@/lib/company-context/normalize";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MIN_WORDS,
} from "@/lib/cover-letter/word-limits";

export function buildCoverLetterPrompt(input: CoverLetterGenerationInput): string {
  const displayCompany =
    input.companyDisplayName?.trim() || input.companyName.trim() || "the company";
  const candidateName = input.candidateName?.trim() || null;
  const candidateRef = candidateName ? `${candidateName}` : "the candidate";
  const closingRule = candidateName
    ? `Closing: default "Regards,\\n${candidateName}" unless JD tone suggests formal or casual startup.`
    : 'Closing: end with a professional sign-off such as "Regards," alone — do not invent or use a bracketed placeholder name.';

  return `You are writing application communications for ${candidateRef}.

Return ONLY valid JSON matching this schema:
{
  "formalCoverLetter": { "content": string, "wordCount": number },
  "emailCoverLetter": { "content": string },
  "linkedinMessage": { "content": string },
  "recruiterDm": { "content": string },
  "whatsappIntro": { "content": string },
  "rationale": {
    "selectedThemes": string[],
    "whyTheseThemes": string,
    "selectedCompanyFacts": string[],
    "selectedRoleRequirements": string[],
    "companyRoleStoryBridges": string[],
    "companyContextUsed": string[],
    "riskFlags": string[]
  }
}

## Hiring argument (critical)
Write a hiring argument for this candidate — not a resume summary.
- Lead with why this person fits this role at ${displayCompany}, using evidence-backed stories.
- Do not restate the resume bullet list or walk chronologically through every role.
- Each story paragraph should prove a specific role requirement using concrete evidence.

## Tone (critical)
Write in a conversational professional style: warm, human, grounded, and specific.
- Sound natural, not stiff, corporate, salesy, or AI-polished.
- Prefer plain sentences over stacked abstractions.
- Use specific operational language from real work, not positioning jargon.
- Avoid inflated phrases, generic enthusiasm, and overly polished corporate wording.

## Punctuation (critical)
- Do NOT use em dashes (—) in final copy.
- Prefer commas, periods, semicolons, or separate sentences instead of dash-linked clauses.
- Keep sentences readable; split long thoughts rather than chaining with dashes.

## Length (critical)
Formal cover letter HARD MAXIMUM: ${FORMAL_COVER_LETTER_MAX_WORDS} words. Target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS} words. One page only. If unsure, write shorter.

## Banned phrases (never use in final copy)
${COVER_LETTER_BANNED_PHRASES.map((phrase) => `- "${phrase}"`).join("\n")}

## Company name in prose (critical)
Use ONLY this human-readable display name in the letter body: "${displayCompany}"
- NEVER paste URLs (http/https/www) into prose.
- NEVER use the website URL as the company name.
- Website is metadata only — not a substitute for the company name.

## Structured generation workflow (follow in order)
Before writing final copy, internally complete these steps and reflect them in rationale JSON:

### Step 1 — Select company facts (required: at least 2)
From company context, pick specific facts about products, customers, industry, mission, hiring priorities, or narrative angles.
Record each in rationale.selectedCompanyFacts.

### Step 2 — Select role requirements (required: at least 2)
From the job description, pick explicit responsibilities, skills, or outcomes the role needs.
Record each in rationale.selectedRoleRequirements.

### Step 3 — Select strongest stories (use inventory story spine)
Use the inventory story spine proof stories (Story 1 = highest relevance). Prefer 1–2 primary stories, optionally 1 supporting story.
Strong inventory proof marked "NOT on resume draft" is valid cover letter evidence. Do NOT include every story. Avoid founder soup.

### Step 4 — Build company → role → story bridges (required: at least 2)
For each major story paragraph, create an explicit bridge in rationale.companyRoleStoryBridges using this pattern:
"Company fact: … | Role requirement: … | Evidence: … | Why relevant: …"
The bridge must be explicit — do not rely on implication.

### Step 5 — Draft the cover letter
Each major story paragraph MUST follow:
Company fact → Role requirement → Candidate evidence → Why relevant (explicit connection sentence).

## Rules
1. Use the inventory story spine as the primary factual evidence universe — not the resume draft alone.
2. Use the resume draft consistency section only to align wording with what already appears on the resume.
3. Use the Application Communication Profile for tone and supplementary stories only — do not copy internal positioning phrases into final wording.
4. Company context is REQUIRED — do not write a generic letter that could go to any company.
5. Do not invent facts, metrics, employers, or titles.
6. Avoid generic excitement and empty enthusiasm.
7. Use real industry terms. Do NOT invent unsupported positioning titles.
8. Do NOT describe the candidate as a software engineer unless inventory/JD evidence clearly supports it.
9. Do NOT overclaim technical, AI/ML, or senior authority beyond what the evidence supports.
10. Explain why the candidate is applying for this specific role at ${displayCompany}.
11. Secondary formats must be shorter and copyable.
12. Determine addressee from JD: named person > recruiter/poster > team > "Hiring Manager" at ${displayCompany}.
13. ${closingRule}
14. Never use bracketed placeholder names in final copy.
15. Respect honest gaps and avoid-overclaim notes — do not claim unsupported JD requirements.

## Company context usage (critical)
- REQUIRED: weave at least 2 company-specific facts into the formal letter (products, customers, industry, hiring priorities — not mission worship).
- REQUIRED: reference at least 2 role-specific requirements from the JD.
- REQUIRED: at least 2 explicit company-role-story bridges in rationale AND reflected in prose.
- Prefer suggestedNarrativeAngles only when supported by inventory evidence.
- NEVER write generic admiration ("deeply resonate with your mission", "admire your vision", "inspired by your values").
- Connect practical work to what ${displayCompany} appears to need — cite specific facts, not feelings about the brand.

## Formal cover letter structure
Opening (specific to ${displayCompany} + role)
→ Story block 1 (company fact → role need → evidence → explicit relevance)
→ Story block 2 (same pattern, optional third if tight on word count)
→ Close

## Job description
${input.jobDescription.rawText}

## Role / company fields
Company (display name for prose): ${displayCompany}
Country: ${input.country}
${input.jobDescription.roleTitle ? `Role title: ${input.jobDescription.roleTitle}` : ""}
${input.companyWebsite ? `Website (metadata only — do NOT paste into prose): ${input.companyWebsite}` : ""}

## Inventory story spine + resume consistency
${input.resumeEvidenceSpine}

## Application Communication Profile
${input.communicationProfile || "(No profile provided — use resume evidence only, conservative tone.)"}

## Company context (confidence: ${input.companyContext.confidence})
${formatCompanyContextForPrompt(input.companyContext)}

${input.additionalInstructions ? `## Additional instructions\n${input.additionalInstructions}` : ""}
`;
}

export function buildCoverLetterCompressionPrompt(
  input: CoverLetterGenerationInput,
  draft: { formalContent: string; wordCount: number },
): string {
  return `${buildCoverLetterPrompt(input)}

## Revision required
The previous draft was ${draft.wordCount} words. Rewrite the formal cover letter to be at most ${FORMAL_COVER_LETTER_MAX_WORDS} words (target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}) while preserving facts, addressee, closing, company facts, role requirements, and explicit bridges.
Remove banned phrases and reduce abstraction. Keep the same JSON schema.

Previous draft:
${draft.formalContent}
`;
}

export function promptIncludesCoverLetterRules(prompt: string): boolean {
  return (
    prompt.includes("formalCoverLetter") &&
    prompt.includes("Application Communication Profile") &&
    prompt.includes("Inventory story spine") &&
    prompt.includes("conversational professional") &&
    prompt.includes(String(FORMAL_COVER_LETTER_MAX_WORDS))
  );
}

export function promptIncludesBannedPhraseRules(prompt: string): boolean {
  return prompt.includes("founder-operator") && prompt.includes("Banned phrases");
}

export function promptIncludesToneRules(prompt: string): boolean {
  return (
    prompt.includes("warm") &&
    prompt.includes("human") &&
    prompt.includes("generic enthusiasm")
  );
}

export function promptIncludesPunctuationRules(prompt: string): boolean {
  return prompt.includes("em dash") && prompt.includes("commas, periods, semicolons");
}

export function promptIncludesCoverLetterCompanyContextRules(prompt: string): boolean {
  return (
    prompt.includes("Company context usage (critical)") &&
    prompt.includes("selectedCompanyFacts") &&
    prompt.includes("companyRoleStoryBridges")
  );
}

export function promptRequiresExplicitBridges(prompt: string): boolean {
  return prompt.includes("Company fact → Role requirement → Candidate evidence");
}

export function promptIncludesHiringArgumentRules(prompt: string): boolean {
  return (
    prompt.includes("hiring argument") &&
    prompt.includes("not a resume summary") &&
    prompt.includes("evidence-backed stories")
  );
}

export function promptIncludesStorySpineRules(prompt: string): boolean {
  return (
    prompt.includes("inventory story spine") &&
    prompt.includes("consistency reference only") &&
    prompt.includes("Avoid overclaim") &&
    prompt.includes("Honest gaps")
  );
}

export function promptExcludesCandidateNamePlaceholder(prompt: string): boolean {
  return (
    !prompt.includes("[Candidate Name]") &&
    prompt.includes("Never use bracketed placeholder names")
  );
}
