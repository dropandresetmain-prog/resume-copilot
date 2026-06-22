import type { CoverLetterRevisionAction } from "@/types/cover-letter-draft";
import { COVER_LETTER_BANNED_PHRASES } from "@/lib/cover-letter/banned-phrases";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MIN_WORDS,
} from "@/lib/cover-letter/word-limits";

export type CoverLetterRevisionPromptInput = {
  currentBody: string;
  action: CoverLetterRevisionAction;
  customInstruction?: string;
  companyDisplayName?: string;
  roleTitle?: string;
  resumeEvidenceSpine?: string;
  communicationProfile?: string;
  additionalInstructions?: string;
};

export const COVER_LETTER_REVISION_ACTION_LABELS: Record<
  Exclude<CoverLetterRevisionAction, "custom">,
  string
> = {
  shorten: "Shorten to 420 words",
  warmer: "Make warmer",
  more_conversational: "Make more conversational",
  more_direct: "Make more direct",
  more_formal: "Make more formal",
  remove_ai_phrases: "Remove AI-sounding phrases",
  emphasize_company_fit: "Emphasize company fit",
  emphasize_role_fit: "Emphasize role fit",
  emphasize_technical_ai: "Emphasize technical/AI work carefully",
  emphasize_founder_business: "Emphasize founder/business experience",
};

function getActionInstruction(action: CoverLetterRevisionAction, customInstruction?: string): string {
  switch (action) {
    case "shorten":
      return `Compress to at most ${FORMAL_COVER_LETTER_MAX_WORDS} words (target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}). Remove repetition and abstraction.`;
    case "warmer":
      return "Make the tone warmer and more human while staying professional.";
    case "more_conversational":
      return "Make the tone more conversational and natural, like Min Htet speaking plainly.";
    case "more_direct":
      return "Make the letter more direct and concise. Lead with relevance faster.";
    case "more_formal":
      return "Make the tone slightly more formal while keeping it natural, not corporate.";
    case "remove_ai_phrases":
      return `Remove AI-sounding or internal positioning phrases. Never use: ${COVER_LETTER_BANNED_PHRASES.join(", ")}.`;
    case "emphasize_company_fit":
      return "Strengthen the why-this-company section using only supported context.";
    case "emphasize_role_fit":
      return "Strengthen why this specific role fits Min Htet's supported experience.";
    case "emphasize_technical_ai":
      return "Emphasize practical AI-assisted building and workflow automation carefully without overclaiming engineering seniority.";
    case "emphasize_founder_business":
      return "Emphasize hands-on founder/business operations experience in plain language, not positioning jargon.";
    case "custom":
      return customInstruction?.trim() || "Revise for clarity and natural tone.";
    default:
      return "Revise for clarity and natural tone.";
  }
}

export function buildCoverLetterRevisionPrompt(input: CoverLetterRevisionPromptInput): string {
  const instruction = getActionInstruction(input.action, input.customInstruction);

  return `You are revising a formal cover letter for Min Htet (always "Min Htet", never "Min").

Return ONLY valid JSON:
{
  "body": string,
  "wordCount": number,
  "warnings": string[]
}

## Revision task
${instruction}

## Hard rules
- Preserve factual claims supported by the resume evidence spine. Do not invent employers, titles, metrics, or achievements.
- Preserve addressee and closing signature ("Min Htet").
- HARD MAX ${FORMAL_COVER_LETTER_MAX_WORDS} words. Target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}.
- Conversational professional tone: warm, human, grounded, specific — not corporate or AI-polished.
- Never use banned phrases: ${COVER_LETTER_BANNED_PHRASES.join(", ")}.
${input.companyDisplayName ? `- Use company display name in prose: "${input.companyDisplayName}"` : ""}
${input.roleTitle ? `- Role: ${input.roleTitle}` : ""}

${input.resumeEvidenceSpine ? `## Resume evidence spine\n${input.resumeEvidenceSpine}` : ""}
${input.communicationProfile ? `## Application Communication Profile (tone/stories only — do not copy jargon)\n${input.communicationProfile}` : ""}
${input.additionalInstructions ? `## Original additional instructions\n${input.additionalInstructions}` : ""}

## Current cover letter
${input.currentBody}
`;
}

export function isCoverLetterRevisionAction(value: string): value is CoverLetterRevisionAction {
  return (
    value === "shorten" ||
    value === "warmer" ||
    value === "more_conversational" ||
    value === "more_direct" ||
    value === "more_formal" ||
    value === "remove_ai_phrases" ||
    value === "emphasize_company_fit" ||
    value === "emphasize_role_fit" ||
    value === "emphasize_technical_ai" ||
    value === "emphasize_founder_business" ||
    value === "custom"
  );
}
