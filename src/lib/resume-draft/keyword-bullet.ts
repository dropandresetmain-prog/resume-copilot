export function parseKeywordBullet(
  text: string,
  fallbackKeyword = "Experience",
): {
  keyword: string;
  statement: string;
} {
  const match = text.match(/^([^:]{1,40}):\s*(.+)$/);
  if (match) {
    return {
      keyword: match[1].trim(),
      statement: match[2].trim(),
    };
  }
  return {
    keyword: fallbackKeyword,
    statement: text.trim(),
  };
}

export function formatKeywordBullet(keyword: string, statement: string): string {
  const cleanKeyword = keyword.trim() || "Experience";
  const cleanStatement = statement.trim();
  if (!cleanStatement) {
    return `${cleanKeyword}:`;
  }
  if (/^[^:]+:\s/.test(cleanStatement)) {
    return cleanStatement;
  }
  return `${cleanKeyword}: ${cleanStatement}`;
}
