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
  const closingSignature = candidateName ? candidateName : "[Candidate Name]";

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

## Tone (critical)
Write in a conversational professional style — warm, human, grounded, and specific.
- Sound natural, not stiff, corporate, salesy, or AI-polished.
- Prefer plain sentences over stacked abstractions.
- Use specific operational language from real work, not positioning jargon.

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

### Step 3 — Select strongest stories (use ranked evidence)
Use the ranked resume evidence (Story 1 = most relevant). Prefer 1–2 primary stories, optionally 1 supporting story.
Do NOT include every story. Avoid founder soup.

### Step 4 — Build company → role → story bridges (required: at least 2)
For each major story paragraph, create an explicit bridge in rationale.companyRoleStoryBridges using this pattern:
"Company fact: … | Role requirement: … | Evidence: … | Why relevant: …"
The bridge must be explicit — do not rely on implication.

### Step 5 — Draft the cover letter
Each major story paragraph MUST follow:
Company fact → Role requirement → Candidate evidence → Why relevant (explicit connection sentence).

## Rules
1. Use ranked resume evidence as the primary factual source.
2. Use the Application Communication Profile for tone and supplementary stories only — do not copy internal positioning phrases into final wording.
3. Company context is REQUIRED — do not write a generic letter that could go to any company.
4. Do not invent facts, metrics, employers, or titles.
5. Avoid generic excitement and empty enthusiasm.
6. Use real industry terms. Do NOT invent unsupported positioning titles.
7. Do NOT describe the candidate as a software engineer unless the resume/JD evidence clearly supports it.
8. Do NOT overclaim technical, AI/ML, or senior authority beyond what the evidence supports.
9. Explain why the candidate is applying for this specific role at ${displayCompany}.
10. Secondary formats must be shorter and copyable.
11. Determine addressee from JD: named person > recruiter/poster > team > "Hiring Manager" at ${displayCompany}.
12. Closing: default "Regards,\\n${closingSignature}" unless JD tone suggests formal or casual startup.

## Company context usage (critical)
- REQUIRED: weave at least 2 company-specific facts into the formal letter.
- REQUIRED: reference at least 2 role-specific requirements from the JD.
- REQUIRED: at least 2 explicit company-role-story bridges in rationale AND reflected in prose.
- Prefer suggestedNarrativeAngles when supported by resume evidence.
- NEVER write generic admiration such as "I deeply resonate with your mission".
- Better: connect practical work to what ${displayCompany} appears to need.

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

## Ranked resume evidence spine
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
    prompt.includes("Ranked resume evidence") &&
    prompt.includes("conversational professional") &&
    prompt.includes(String(FORMAL_COVER_LETTER_MAX_WORDS))
  );
}

export function promptIncludesBannedPhraseRules(prompt: string): boolean {
  return prompt.includes("founder-operator") && prompt.includes("Banned phrases");
}

export function promptIncludesToneRules(prompt: string): boolean {
  return prompt.includes("warm") && prompt.includes("human");
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
