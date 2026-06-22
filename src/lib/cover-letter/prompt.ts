import type { CoverLetterGenerationInput } from "@/types/cover-letter-draft";

export function buildCoverLetterPrompt(input: CoverLetterGenerationInput): string {
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

## Rules
1. Use the generated resume evidence spine as the primary factual source.
2. Use the Application Communication Profile for tone, narrative themes, and supplementary stories.
3. Use company context for "why this company" only when accurate and relevant.
4. Do not invent facts, metrics, employers, or titles.
5. Select only 1–3 strongest evidence themes (prefer 1 core + 1 supporting). Avoid founder soup.
6. Do not include every story from the profile.
7. Avoid generic excitement and empty enthusiasm.
8. Use real industry terms (e.g. Strategy & Operations, Product Management, Workflow Automation, Stakeholder Management, Market Expansion, Payment Operations, Reconciliation, Go-to-Market). Do NOT invent positioning titles like "AI-enabled operator" as formal job functions.
9. Do NOT describe Min Htet as a software engineer.
10. Do NOT overclaim fintech, AI/ML, or senior product authority beyond evidence.
11. Respect story execution status in the profile: explored/pilot/prototype stories must be framed accurately (e.g. "explored", "built a prototype"), not as shipped production achievements.
12. Explain why Min Htet is applying for this specific role at this company.
13. Formal cover letter: 350–450 words (target ~420). One-page friendly business letter.
14. Secondary formats must be shorter and copyable.
15. Determine addressee from JD: named person > recruiter/poster > team > "Hiring Manager" at company. Avoid "To whom it may concern."
16. Closing: default "Regards,\\nMin Htet" unless JD tone suggests formal (Yours sincerely) or casual startup (Best/Cheers).

## Formal cover letter structure
Opening → Why this role → Selected evidence themes → Why this company → Close

## Job description
${input.jobDescription.rawText}

## Role / company fields
Company: ${input.companyName}
Country: ${input.country}
${input.companyWebsite ? `Website: ${input.companyWebsite}` : ""}
${input.jobDescription.roleTitle ? `Role title: ${input.jobDescription.roleTitle}` : ""}

## Generated resume evidence spine
${input.resumeEvidenceSpine}

## Application Communication Profile
${input.communicationProfile || "(No profile provided — use resume evidence only, conservative tone.)"}

## Company context (confidence: ${input.companyContext.confidence})
${JSON.stringify(input.companyContext, null, 2)}

${input.additionalInstructions ? `## Additional instructions\n${input.additionalInstructions}` : ""}
`;
}

export function promptIncludesCoverLetterRules(prompt: string): boolean {
  return (
    prompt.includes("Min Htet") &&
    prompt.includes("formalCoverLetter") &&
    prompt.includes("Application Communication Profile") &&
    prompt.includes("resume evidence spine")
  );
}
