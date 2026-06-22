import type { CoverLetterGenerationInput } from "@/types/cover-letter-draft";
import { COVER_LETTER_BANNED_PHRASES } from "@/lib/cover-letter/banned-phrases";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MIN_WORDS,
} from "@/lib/cover-letter/word-limits";

export function buildCoverLetterPrompt(input: CoverLetterGenerationInput): string {
  const displayCompany =
    input.companyDisplayName?.trim() || input.companyName.trim() || "the company";

  return `You are writing application communications for Min Htet (always refer to him as "Min Htet", never "Min").

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
    "companyContextUsed": string[],
    "riskFlags": string[]
  }
}

## Tone (critical)
Write like Min Htet — conversational professional, warm, human, grounded, and specific.
- Sound natural, not stiff, corporate, salesy, or AI-polished.
- Prefer plain sentences over stacked abstractions.
- Use specific operational language from real work, not positioning jargon.
- Good example: "I've spent the past few years building and running small businesses, so I'm used to dealing with messy operational problems, customers, payments, and execution — not just planning from a distance."
- Bad example: "My founder-operator background gives me a unique ability to bridge strategic execution, AI-enabled systems thinking, and commercial transformation."

## Length (critical)
Formal cover letter HARD MAXIMUM: ${FORMAL_COVER_LETTER_MAX_WORDS} words. Target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS} words. One page only. If unsure, write shorter.

## Banned phrases (never use in final copy)
${COVER_LETTER_BANNED_PHRASES.map((phrase) => `- "${phrase}"`).join("\n")}

Use natural alternatives instead, such as:
- "I've built and run small businesses where operations, customers, payments, and execution mattered."
- "I've also been using AI-assisted tools to build practical systems around real workflow problems."
- "My background sits across strategy, operations, product thinking, and hands-on execution."

## Company name in prose
Use this normalized display name in the letter body: "${displayCompany}"
Do NOT paste all-caps legal entity names or parenthetical country labels into prose.

## Rules
1. Use the generated resume evidence spine as the primary factual source.
2. Use the Application Communication Profile for tone and supplementary stories only — do not copy internal positioning phrases into final wording.
3. Use company context for "why this company" only when accurate and relevant.
4. Do not invent facts, metrics, employers, or titles.
5. Select only 1–3 strongest evidence themes (prefer 1 core + 1 supporting). Avoid founder soup.
6. Do not include every story from the profile.
7. Avoid generic excitement and empty enthusiasm.
8. Use real industry terms (e.g. Strategy & Operations, Product Management, Workflow Automation, Stakeholder Management, Market Expansion, Payment Operations, Reconciliation, Go-to-Market). Do NOT invent positioning titles like "AI-enabled operator" as formal job functions.
9. Do NOT describe Min Htet as a software engineer.
10. Do NOT overclaim fintech, AI/ML, or senior product authority beyond evidence.
11. Respect story execution status in the profile: explored/pilot/prototype stories must be framed accurately.
12. Explain why Min Htet is applying for this specific role at this company.
13. Secondary formats must be shorter and copyable.
14. Determine addressee from JD: named person > recruiter/poster > team > "Hiring Manager" at company. Avoid "To whom it may concern."
15. Closing: default "Regards,\\nMin Htet" unless JD tone suggests formal (Yours sincerely) or casual startup (Best/Cheers).

## Formal cover letter structure
Opening → Why this role → Selected evidence themes → Why this company → Close

## Job description
${input.jobDescription.rawText}

## Role / company fields
Company (display): ${displayCompany}
${input.companyNameRaw && input.companyNameRaw !== displayCompany ? `Company (raw input): ${input.companyNameRaw}` : ""}
Country: ${input.country}
${input.companyWebsite ? `Website: ${input.companyWebsite}` : ""}
${input.jobDescription.roleTitle ? `Role title: ${input.jobDescription.roleTitle}` : ""}

## Generated resume evidence spine
${input.resumeEvidenceSpine}

## Application Communication Profile
${input.communicationProfile || "(No profile provided — use resume evidence only, conservative tone.)"}

## Company context (confidence: ${input.companyContext.confidence})
${JSON.stringify(
  {
    ...input.companyContext,
    companyName: displayCompany,
  },
  null,
  2,
)}

${input.additionalInstructions ? `## Additional instructions\n${input.additionalInstructions}` : ""}
`;
}

export function buildCoverLetterCompressionPrompt(
  input: CoverLetterGenerationInput,
  draft: { formalContent: string; wordCount: number },
): string {
  return `${buildCoverLetterPrompt(input)}

## Revision required
The previous draft was ${draft.wordCount} words. Rewrite the formal cover letter to be at most ${FORMAL_COVER_LETTER_MAX_WORDS} words (target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}) while preserving facts, addressee, and closing.
Remove banned phrases and reduce abstraction. Keep the same JSON schema.

Previous draft:
${draft.formalContent}
`;
}

export function promptIncludesCoverLetterRules(prompt: string): boolean {
  return (
    prompt.includes("Min Htet") &&
    prompt.includes("formalCoverLetter") &&
    prompt.includes("Application Communication Profile") &&
    prompt.includes("resume evidence spine") &&
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
