export const COVER_LETTER_BANNED_PHRASES = [
  "founder-operator",
  "founder operator",
  "ai-enabled operator",
  "ai enabled operator",
  "commercially grounded operator",
  "systems thinker",
  "product-minded business builder",
  "product minded business builder",
  "dynamic environment",
  "passionate about innovation",
  "uniquely qualified",
  "leverage synergies",
  "spearheaded transformative innovation",
  "ai-assisted builder",
  "bridge strategic execution",
  "commercial transformation",
] as const;

export function detectBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return COVER_LETTER_BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

export function hasBannedPhrases(text: string): boolean {
  return detectBannedPhrases(text).length > 0;
}
