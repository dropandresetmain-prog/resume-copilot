const PRESERVED_ACRONYMS = new Set([
  "ABC",
  "DBS",
  "IBM",
  "AWS",
  "AI",
  "SME",
  "APAC",
  "NTU",
  "NUS",
  "HR",
  "CRM",
  "ERP",
  "B2B",
  "B2C",
]);

const LEGAL_SUFFIX_PATTERNS = [
  /\s+PTE\.?\s*LTD\.?$/i,
  /\s+PRIVATE\s+LIMITED$/i,
  /\s+LIMITED$/i,
  /\s+LTD\.?$/i,
  /\s+INC\.?$/i,
  /\s+LLC$/i,
  /\s+CO\.?$/i,
  /\s+CORP\.?$/i,
  /\s+CORPORATION$/i,
];

const COUNTRY_LABEL_PATTERNS = [
  /\s*\(\s*SINGAPORE\s*\)\s*$/i,
  /\s*\(\s*SG\s*\)\s*$/i,
  /\s*\(\s*MALAYSIA\s*\)\s*$/i,
  /\s*\(\s*MY\s*\)\s*$/i,
];

function formatToken(token: string, titleCaseAllCaps = false): string {
  const upper = token.toUpperCase();
  if (PRESERVED_ACRONYMS.has(upper)) {
    return upper;
  }
  if (token.includes("-")) {
    return token
      .split("-")
      .map((part) => formatToken(part, titleCaseAllCaps))
      .join("-");
  }
  if (titleCaseAllCaps || token === upper) {
    if (token.length === 0) {
      return token;
    }
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  }
  return token;
}

function stripLegalAndCountrySuffixes(name: string): string {
  let result = name.trim();
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of COUNTRY_LABEL_PATTERNS) {
      const next = result.replace(pattern, "").trim();
      if (next !== result) {
        result = next;
        changed = true;
      }
    }
    for (const pattern of LEGAL_SUFFIX_PATTERNS) {
      const next = result.replace(pattern, "").trim();
      if (next !== result) {
        result = next;
        changed = true;
      }
    }
  }

  return result;
}

/** Normalize legal/all-caps company names for natural cover letter prose. */
export function normalizeCompanyDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  const stripped = stripLegalAndCountrySuffixes(trimmed);
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return trimmed;
  }

  const isAllCapsInput = words.every((word) => word === word.toUpperCase());
  const formatted = words.map((word) => formatToken(word, isAllCapsInput)).join(" ");
  return formatted || trimmed;
}
