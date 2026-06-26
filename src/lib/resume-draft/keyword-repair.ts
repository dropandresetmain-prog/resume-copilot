import { formatKeywordBullet, parseKeywordBullet } from "@/lib/resume-draft/keyword-bullet";

const GENERIC_KEYWORD_PATTERN =
  /^(experience|work experience|achievement|general|operations|responsibilities)$/i;

export function isGenericKeyword(keyword: string): boolean {
  return GENERIC_KEYWORD_PATTERN.test(keyword.trim());
}

/**
 * Repair bullets where the model used a generic keyword like "Experience:"
 * before a specific keyword phrase.
 */
export function repairKeywordBullet(
  text: string,
  fallbackKeyword = "Experience",
): { keyword: string; statement: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { keyword: fallbackKeyword, statement: "" };
  }

  const nestedGeneric = trimmed.match(/^Experience:\s*([^:]+):\s*(.+)$/i);
  if (nestedGeneric) {
    return {
      keyword: nestedGeneric[1].trim(),
      statement: nestedGeneric[2].trim(),
    };
  }

  const parsed = parseKeywordBullet(trimmed, fallbackKeyword);

  if (isGenericKeyword(parsed.keyword) && parsed.statement.includes(":")) {
    const inner = parseKeywordBullet(parsed.statement, fallbackKeyword);
    if (!isGenericKeyword(inner.keyword) && inner.statement.trim()) {
      return inner;
    }
  }

  if (isGenericKeyword(parsed.keyword)) {
    const phraseMatch = parsed.statement.match(/^([^:]{3,50}):\s*(.+)$/);
    if (phraseMatch && !isGenericKeyword(phraseMatch[1])) {
      return {
        keyword: phraseMatch[1].trim(),
        statement: phraseMatch[2].trim(),
      };
    }
  }

  return parsed;
}

export function repairBulletText(text: string, fallbackKeyword = "Experience"): string {
  const repaired = repairKeywordBullet(text, fallbackKeyword);
  return formatKeywordBullet(repaired.keyword, repaired.statement);
}
