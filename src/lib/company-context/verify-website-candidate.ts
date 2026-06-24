import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import {
  extractWebsiteHostname,
  isRejectedDiscoveryUrl,
  normalizeCompanyWebsiteUrl,
} from "@/lib/firecrawl/url";

export type WebsiteDiscoveryConfidence = "high" | "medium" | "low";

export type WebsiteVerificationInput = {
  companyName: string;
  roleTitle?: string;
  country?: string;
  jobDescriptionText?: string;
  url: string;
  title?: string;
  description?: string;
  homepageText?: string;
};

export type WebsiteVerificationResult = {
  url: string;
  domain: string;
  score: number;
  confidence: WebsiteDiscoveryConfidence;
  reason: string;
  rejected: boolean;
  rejectReason?: string;
};

const STOPWORDS = new Set([
  "about",
  "and",
  "company",
  "for",
  "from",
  "home",
  "official",
  "our",
  "site",
  "the",
  "this",
  "with",
  "your",
]);

function tokenizeCompanyName(companyName: string): string[] {
  const normalized = normalizeCompanyDisplayName(companyName).toLowerCase();
  return normalized
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function tokenizeKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function confidenceFromScore(score: number): WebsiteDiscoveryConfidence {
  if (score >= 70) {
    return "high";
  }
  if (score >= 45) {
    return "medium";
  }
  return "low";
}

/** Short or single-token names that are risky to auto-match from SERP metadata alone. */
const GENERIC_COMPANY_NAME_TOKENS = new Set([
  "bolt",
  "wave",
  "scale",
  "square",
  "apex",
  "pulse",
  "spark",
  "orbit",
  "nova",
  "prime",
  "unity",
  "delta",
  "atlas",
  "summit",
  "vertex",
  "mercury",
  "apollo",
  "horizon",
]);

export function isGenericCompanyName(companyName: string): boolean {
  const tokens = tokenizeCompanyName(companyName);
  if (tokens.length === 0) {
    return false;
  }
  if (tokens.length === 1) {
    const token = tokens[0];
    return token.length <= 6 || GENERIC_COMPANY_NAME_TOKENS.has(token);
  }
  return tokens.every((token) => token.length <= 4 || GENERIC_COMPANY_NAME_TOKENS.has(token));
}

function applyConfidenceGuardrails(
  score: number,
  input: WebsiteVerificationInput,
  companyTokens: string[],
): WebsiteDiscoveryConfidence {
  let confidence = confidenceFromScore(score);
  const hasHomepage = Boolean(input.homepageText?.trim());

  if (!hasHomepage && confidence === "high") {
    confidence = "medium";
  }

  if (
    isGenericCompanyName(input.companyName) &&
    confidence === "high" &&
    (!hasHomepage || !textMentionsCompany(input.homepageText ?? "", companyTokens))
  ) {
    confidence = "medium";
  }

  return confidence;
}

function domainMatchesCompany(domain: string, tokens: string[]): boolean {
  const compactDomain = domain.replace(/[^a-z0-9]/gi, "");
  return tokens.some((token) => {
    if (token.length < 3) {
      return false;
    }
    return domain.includes(token) || compactDomain.includes(token);
  });
}

function textMentionsCompany(text: string, tokens: string[]): boolean {
  const haystack = text.toLowerCase();
  return tokens.some((token) => token.length >= 3 && haystack.includes(token));
}

function extractJdKeywords(jobDescriptionText?: string): string[] {
  if (!jobDescriptionText?.trim()) {
    return [];
  }
  return uniqueTokens(tokenizeKeywords(jobDescriptionText)).slice(0, 12);
}

function keywordOverlapScore(haystack: string, keywords: string[]): number {
  if (keywords.length === 0) {
    return 0;
  }
  const lower = haystack.toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword)).length;
  return Math.min(20, hits * 4);
}

function detectConflictingIdentity(
  companyTokens: string[],
  title?: string,
  homepageText?: string,
): boolean {
  const combined = `${title ?? ""}\n${homepageText ?? ""}`.trim();
  if (!combined || companyTokens.length === 0) {
    return false;
  }
  if (textMentionsCompany(combined, companyTokens)) {
    return false;
  }

  const titleOnly = title?.trim() ?? "";
  if (titleOnly.length < 4) {
    return false;
  }

  const firstSegment = titleOnly.split(/[|\-–—]/)[0]?.trim() ?? titleOnly;
  const foreignTokens = firstSegment
    .split(/[^A-Za-z0-9]+/)
    .filter((token) => token.length >= 4);
  return foreignTokens.length >= 2;
}

export function verifyWebsiteCandidate(
  input: WebsiteVerificationInput,
): WebsiteVerificationResult {
  const normalizedUrl = normalizeCompanyWebsiteUrl(input.url);
  const domain = normalizedUrl ? extractWebsiteHostname(normalizedUrl) : null;

  if (!normalizedUrl || !domain) {
    return {
      url: input.url,
      domain: domain ?? "",
      score: 0,
      confidence: "low",
      reason: "Invalid URL.",
      rejected: true,
      rejectReason: "Invalid URL.",
    };
  }

  if (isRejectedDiscoveryUrl(normalizedUrl)) {
    return {
      url: normalizedUrl,
      domain,
      score: 0,
      confidence: "low",
      reason: "Rejected non-company URL type.",
      rejected: true,
      rejectReason: "Job board, social, news, or directory URL.",
    };
  }

  const companyTokens = tokenizeCompanyName(input.companyName);
  const combinedText = [input.title, input.description, input.homepageText]
    .filter(Boolean)
    .join("\n");
  const jdKeywords = extractJdKeywords(input.jobDescriptionText);

  let score = 0;
  const reasons: string[] = [];

  if (domainMatchesCompany(domain, companyTokens)) {
    score += 40;
    reasons.push("company name matches domain");
  } else if (textMentionsCompany(domain, companyTokens)) {
    score += 20;
    reasons.push("company name partially matches domain");
  }

  if (textMentionsCompany(input.title ?? "", companyTokens)) {
    score += 20;
    reasons.push("company name in page title");
  }

  if (textMentionsCompany(combinedText, companyTokens)) {
    score += 15;
    reasons.push("company name on homepage");
  }

  const overlap = keywordOverlapScore(combinedText, jdKeywords);
  if (overlap > 0) {
    score += overlap;
    reasons.push("JD keyword overlap on page");
  }

  if (input.roleTitle?.trim() && combinedText.toLowerCase().includes(input.roleTitle.toLowerCase())) {
    score += 5;
    reasons.push("role title mentioned");
  }

  if (input.country?.trim() && combinedText.toLowerCase().includes(input.country.toLowerCase())) {
    score += 5;
    reasons.push("location mentioned");
  }

  if (detectConflictingIdentity(companyTokens, input.title, input.homepageText)) {
    score -= 30;
    reasons.push("possible conflicting company identity");
  }

  score = Math.max(0, Math.min(100, score));
  const confidence = applyConfidenceGuardrails(score, input, companyTokens);

  return {
    url: normalizedUrl,
    domain,
    score,
    confidence,
    reason: reasons.length > 0 ? reasons.join("; ") : "Weak company match.",
    rejected: false,
  };
}
