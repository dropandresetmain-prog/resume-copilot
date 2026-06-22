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

const URL_LIKE_PATTERN = /^(?:https?:\/\/|www\.)/i;
const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s)]+/i;

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

/** True when a value looks like a URL rather than a human company name. */
export function isUrlLikeCompanyName(value: string | undefined | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed) {
    return false;
  }
  return URL_LIKE_PATTERN.test(trimmed) || /\.[a-z]{2,}(?:\/|$)/i.test(trimmed);
}

/** Derive a readable brand label from a company website hostname (e.g. shelfperfect.com → Shelfperfect). */
export function extractBrandNameFromWebsite(website: string | undefined | null): string | null {
  const trimmed = website?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "");
    const segments = host.split(".").filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    const label = segments[segments.length - 2];
    if (!label || label.length < 2 || /^\d+$/.test(label)) {
      return null;
    }
    const words = label.split(/[-_]+/).filter(Boolean);
    return words.map((word) => formatToken(word, true)).join("");
  } catch {
    return null;
  }
}

/** Normalize legal/all-caps company names for natural cover letter prose. */
export function normalizeCompanyDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (isUrlLikeCompanyName(trimmed)) {
    return extractBrandNameFromWebsite(trimmed) ?? trimmed;
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

export function resolveCompanyDisplayNameForProse(options: {
  rawName?: string;
  website?: string;
  savedDisplayName?: string;
}): { companyNameRaw: string; companyDisplayName: string } {
  const rawName = options.rawName?.trim() ?? "";
  const savedDisplay = options.savedDisplayName?.trim();
  const websiteBrand = extractBrandNameFromWebsite(options.website);
  const rawUrlBrand = isUrlLikeCompanyName(rawName) ? extractBrandNameFromWebsite(rawName) : null;

  if (savedDisplay && !isUrlLikeCompanyName(savedDisplay)) {
    const display = normalizeCompanyDisplayName(savedDisplay);
    if (!isUrlLikeCompanyName(display)) {
      return {
        companyNameRaw: rawName || display,
        companyDisplayName: display,
      };
    }
  }

  if (rawName && !isUrlLikeCompanyName(rawName)) {
    return {
      companyNameRaw: rawName,
      companyDisplayName: normalizeCompanyDisplayName(rawName),
    };
  }

  if (websiteBrand) {
    return {
      companyNameRaw: rawName || websiteBrand,
      companyDisplayName: websiteBrand,
    };
  }

  if (rawUrlBrand) {
    return {
      companyNameRaw: rawName,
      companyDisplayName: rawUrlBrand,
    };
  }

  if (rawName) {
    const normalized = normalizeCompanyDisplayName(rawName);
    return {
      companyNameRaw: rawName,
      companyDisplayName: isUrlLikeCompanyName(normalized) ? "the company" : normalized,
    };
  }

  return {
    companyNameRaw: "the company",
    companyDisplayName: "the company",
  };
}

/** Detect URLs in cover letter prose where a company name should appear. */
export function detectCompanyUrlInCoverLetterProse(body: string): string[] {
  const matches = body.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return [...new Set(matches)];
}

export function proseContainsUrlLikeCompanyReference(body: string, displayName: string): boolean {
  if (detectCompanyUrlInCoverLetterProse(body).length > 0) {
    return true;
  }
  if (isUrlLikeCompanyName(displayName) && body.toLowerCase().includes(displayName.toLowerCase())) {
    return true;
  }
  return URL_IN_TEXT_PATTERN.test(body);
}
