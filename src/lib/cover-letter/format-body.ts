/** Split cover letter body into paragraphs for inline preview rendering. */
export function splitCoverLetterParagraphs(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }

  const byBlankLine = trimmed
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (byBlankLine.length > 1) {
    return byBlankLine;
  }

  return trimmed
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
