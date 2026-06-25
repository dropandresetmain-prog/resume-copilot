/** Bracketed placeholder variants that must never appear in user-facing cover letter copy. */
const CANDIDATE_NAME_PLACEHOLDER_PATTERN = /\[candidate\s+name\]/i;

export function containsCandidateNamePlaceholder(text: string): boolean {
  return CANDIDATE_NAME_PLACEHOLDER_PATTERN.test(text);
}

const CLOSING_LINE_PATTERN =
  /^(regards|sincerely|best|warm regards|yours truly|kind regards|thank you)[,.]?\s*$/i;

/**
 * Extract a human name from the closing lines of a cover letter body when present.
 * Returns undefined when no recognizable signature is found.
 */
export function extractClosingSignatureFromBody(body: string): string | undefined {
  const lines = body
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return undefined;
  }

  const lastLine = lines[lines.length - 1]!;
  if (containsCandidateNamePlaceholder(lastLine)) {
    return undefined;
  }

  if (lines.length >= 2) {
    const penultimate = lines[lines.length - 2]!;
    if (CLOSING_LINE_PATTERN.test(penultimate) && lastLine.length <= 80 && !lastLine.includes("@")) {
      return lastLine;
    }
  }

  return undefined;
}

export function buildClosingSignatureInstruction(options: {
  candidateName?: string;
  currentBody: string;
}): string {
  const name = options.candidateName?.trim();
  if (name) {
    return `Preserve addressee and closing signature ("${name}").`;
  }

  const existingSignature = extractClosingSignatureFromBody(options.currentBody);
  if (existingSignature) {
    return `Preserve the existing closing signature ("${existingSignature}") from the current letter. Do not replace it with a placeholder name.`;
  }

  return "Preserve the existing closing from the current letter when present. If no name appears in the closing, end with a professional sign-off (e.g. Regards,) without inventing or using a placeholder name.";
}
