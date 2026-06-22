import type { CoverLetterRevisionPromptInput } from "@/lib/cover-letter/revision-prompt";
import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import { FORMAL_COVER_LETTER_MAX_WORDS } from "@/lib/cover-letter/word-limits";
import type { CoverLetterRevisionModelResult } from "@/lib/cover-letter/revision-parse";

function truncateToMaxWords(body: string, maxWords: number): string {
  const closing = "\n\nRegards,\nMin Htet";
  const closingWordCount = countWords(closing);
  const contentBudget = Math.max(1, maxWords - closingWordCount);
  const words = body.trim().split(/\s+/).filter(Boolean);
  if (words.length <= contentBudget) {
    return body.trim();
  }
  return `${words.slice(0, contentBudget).join(" ")}${closing}`;
}

export function reviseMockCoverLetter(
  input: CoverLetterRevisionPromptInput,
): CoverLetterRevisionModelResult {
  let body = input.currentBody;

  if (input.action === "shorten" || countWords(body) > FORMAL_COVER_LETTER_MAX_WORDS) {
    body = truncateToMaxWords(body, FORMAL_COVER_LETTER_MAX_WORDS);
  }

  if (input.action === "warmer" || input.action === "more_conversational") {
    body = body.replace(
      /I am writing to express my interest/gi,
      "I wanted to reach out about",
    );
  }

  if (input.action === "remove_ai_phrases") {
    for (const phrase of detectBannedPhrases(body)) {
      const pattern = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      body = body.replace(
        pattern,
        "hands-on operations and business execution",
      );
    }
  }

  if (input.action === "custom" && input.customInstruction?.trim()) {
    body = `${body}\n\n[Note: custom revision requested — ${input.customInstruction.trim()}]`;
    body = truncateToMaxWords(body, FORMAL_COVER_LETTER_MAX_WORDS);
  }

  const wordCount = countWords(body);
  return {
    body,
    wordCount,
    warnings: wordCount > FORMAL_COVER_LETTER_MAX_WORDS ? ["Mock revision still above max."] : [],
  };
}
