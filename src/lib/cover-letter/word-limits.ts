export const FORMAL_COVER_LETTER_MIN_WORDS = 300;
export const FORMAL_COVER_LETTER_TARGET_MIN_WORDS = 360;
export const FORMAL_COVER_LETTER_TARGET_MAX_WORDS = 400;
export const FORMAL_COVER_LETTER_MAX_WORDS = 420;

export function isOverWordLimit(wordCount: number): boolean {
  return wordCount > FORMAL_COVER_LETTER_MAX_WORDS;
}

export function isUnderWordMinimum(wordCount: number): boolean {
  return wordCount < FORMAL_COVER_LETTER_MIN_WORDS;
}

export function formatWordCountLabel(wordCount: number): string {
  if (wordCount > FORMAL_COVER_LETTER_MAX_WORDS) {
    return `${wordCount} words — over ${FORMAL_COVER_LETTER_MAX_WORDS} max (shorten before export)`;
  }
  if (wordCount < FORMAL_COVER_LETTER_TARGET_MIN_WORDS) {
    return `${wordCount} words — target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}`;
  }
  if (wordCount > FORMAL_COVER_LETTER_TARGET_MAX_WORDS) {
    return `${wordCount} words — within max; target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}`;
  }
  return `${wordCount} words — within target`;
}
