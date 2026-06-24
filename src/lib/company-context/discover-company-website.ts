import {
  verifyWebsiteCandidate,
  type WebsiteDiscoveryConfidence,
  type WebsiteVerificationResult,
} from "@/lib/company-context/verify-website-candidate";
import {
  buildCompanyWebsiteSearchQuery,
  isFirecrawlConfigured,
  searchWebWithFirecrawl,
} from "@/lib/firecrawl/search-company-website";
import { scrapeCompanyWebsiteWithFirecrawl } from "@/lib/firecrawl/scrape-company-website";
import { resolveEffectiveCompanyWebsite } from "@/lib/jd/extract-website";
import type { GenerateOutputMode } from "@/lib/generate/context-policy";

export type WebsiteDiscoveryCandidate = {
  url: string;
  domain: string;
  confidence: WebsiteDiscoveryConfidence;
  reason: string;
  score: number;
  title?: string;
};

export type WebsiteDiscoveryRejectedCandidate = {
  url: string;
  reason: string;
};

export type CompanyWebsiteDiscoveryResult = {
  status: "not_needed" | "unavailable" | "no_match" | "found";
  candidate: WebsiteDiscoveryCandidate | null;
  rejected: WebsiteDiscoveryRejectedCandidate[];
  searchConfigured: boolean;
  searchQuery?: string;
  costNote: string;
  error?: string;
};

export type DiscoverCompanyWebsiteInput = {
  companyName: string;
  roleTitle?: string;
  country?: string;
  jobDescriptionText?: string;
  confidentialPosting?: boolean;
  companyWebsiteInput?: string;
  outputMode?: GenerateOutputMode;
  forceJdOnly?: boolean;
};

/** Max homepage scrapes per Find click (after one search). */
export const MAX_DISCOVERY_VERIFICATION_SCRAPES = 2;

export const DISCOVERY_COST_NOTE = `Uses Firecrawl search + up to ${MAX_DISCOVERY_VERIFICATION_SCRAPES} verification scrapes (billable).`;

const MIN_SCORE_FOR_HOMEPAGE_VERIFICATION = 45;

function canUseMockWebsiteDiscovery(): boolean {
  return process.env.AI_PROVIDER === "mock" && process.env.NODE_ENV !== "production";
}

export function shouldOfferWebsiteDiscovery(
  input: DiscoverCompanyWebsiteInput,
): boolean {
  if (input.confidentialPosting || input.forceJdOnly) {
    return false;
  }

  const needsCompanyContext =
    input.outputMode === "resume_and_cover_letter" ||
    input.outputMode === "cover_letter_only";
  if (!needsCompanyContext) {
    return false;
  }

  if (!input.companyName?.trim()) {
    return false;
  }

  const resolved = resolveEffectiveCompanyWebsite({
    userProvided: input.companyWebsiteInput,
    jobDescriptionText: input.jobDescriptionText,
  });
  return !resolved.website;
}

/** Select top SERP candidates eligible for capped homepage verification scrapes. */
export function selectUrlsForHomepageVerification(
  serpResults: WebsiteVerificationResult[],
  maxScrapes: number = MAX_DISCOVERY_VERIFICATION_SCRAPES,
): string[] {
  return serpResults
    .filter((result) => !result.rejected && result.score >= MIN_SCORE_FOR_HOMEPAGE_VERIFICATION)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxScrapes)
    .map((result) => result.url);
}

function buildMockDiscoveryResult(
  input: DiscoverCompanyWebsiteInput,
): CompanyWebsiteDiscoveryResult {
  const company = input.companyName.trim().toLowerCase();
  if (company.includes("acme")) {
    return {
      status: "found",
      candidate: {
        url: "https://acme.com",
        domain: "acme.com",
        confidence: "high",
        reason: "Mock discovery — homepage verified company match.",
        score: 85,
        title: "Acme Corp — Official Site",
      },
      rejected: [],
      searchConfigured: true,
      searchQuery: buildCompanyWebsiteSearchQuery(input),
      costNote: DISCOVERY_COST_NOTE,
    };
  }

  if (company.includes("ambiguous")) {
    return {
      status: "found",
      candidate: {
        url: "https://example-consulting.io",
        domain: "example-consulting.io",
        confidence: "medium",
        reason: "Mock discovery — partial company match.",
        score: 52,
        title: "Example Consulting",
      },
      rejected: [{ url: "https://www.linkedin.com/company/example", reason: "Job board, social, news, or directory URL." }],
      searchConfigured: true,
      searchQuery: buildCompanyWebsiteSearchQuery(input),
      costNote: DISCOVERY_COST_NOTE,
    };
  }

  return {
    status: "no_match",
    candidate: null,
    rejected: [],
    searchConfigured: true,
    searchQuery: buildCompanyWebsiteSearchQuery(input),
    costNote: DISCOVERY_COST_NOTE,
  };
}

function verifySerpCandidate(
  input: DiscoverCompanyWebsiteInput,
  item: { url: string; title?: string; description?: string },
): WebsiteVerificationResult {
  return verifyWebsiteCandidate({
    companyName: input.companyName,
    roleTitle: input.roleTitle,
    country: input.country,
    jobDescriptionText: input.jobDescriptionText,
    url: item.url,
    title: item.title,
    description: item.description,
  });
}

async function verifyWithHomepageScrape(
  input: DiscoverCompanyWebsiteInput,
  item: { url: string; title?: string; description?: string },
): Promise<WebsiteVerificationResult> {
  const scrape = await scrapeCompanyWebsiteWithFirecrawl(item.url);
  const homepageText = scrape.success ? scrape.markdown ?? scrape.text : undefined;
  const title = scrape.success ? scrape.title ?? item.title : item.title;

  return verifyWebsiteCandidate({
    companyName: input.companyName,
    roleTitle: input.roleTitle,
    country: input.country,
    jobDescriptionText: input.jobDescriptionText,
    url: item.url,
    title,
    description: item.description,
    homepageText,
  });
}

export async function discoverCompanyWebsite(
  input: DiscoverCompanyWebsiteInput,
): Promise<CompanyWebsiteDiscoveryResult> {
  if (!shouldOfferWebsiteDiscovery(input)) {
    return {
      status: "not_needed",
      candidate: null,
      rejected: [],
      searchConfigured: isFirecrawlConfigured(),
      costNote: DISCOVERY_COST_NOTE,
    };
  }

  const searchQuery = buildCompanyWebsiteSearchQuery(input);

  if (!isFirecrawlConfigured()) {
    if (canUseMockWebsiteDiscovery()) {
      return buildMockDiscoveryResult(input);
    }

    return {
      status: "unavailable",
      candidate: null,
      rejected: [],
      searchConfigured: false,
      searchQuery,
      costNote: DISCOVERY_COST_NOTE,
      error: "FIRECRAWL_API_KEY is not configured.",
    };
  }

  const search = await searchWebWithFirecrawl(searchQuery, {
    limit: 5,
    scrapeMarkdown: false,
  });

  if (!search.success) {
    return {
      status: "unavailable",
      candidate: null,
      rejected: [],
      searchConfigured: true,
      searchQuery,
      costNote: DISCOVERY_COST_NOTE,
      error: search.error,
    };
  }

  const rejected: WebsiteDiscoveryRejectedCandidate[] = [];
  const serpVerified: WebsiteVerificationResult[] = [];

  for (const item of search.results) {
    const result = verifySerpCandidate(input, item);
    if (result.rejected) {
      rejected.push({
        url: result.url,
        reason: result.rejectReason ?? result.reason,
      });
      continue;
    }
    serpVerified.push(result);
  }

  const urlsToScrape = selectUrlsForHomepageVerification(serpVerified);
  const homepageVerifiedByUrl = new Map<string, WebsiteVerificationResult>();

  for (const url of urlsToScrape) {
    const item = search.results.find((result) => result.url === url);
    if (!item) {
      continue;
    }
    homepageVerifiedByUrl.set(url, await verifyWithHomepageScrape(input, item));
  }

  const verified = serpVerified.map(
    (result) => homepageVerifiedByUrl.get(result.url) ?? result,
  );

  verified.sort((left, right) => right.score - left.score);
  const best = verified[0];

  if (!best || best.confidence === "low") {
    return {
      status: "no_match",
      candidate: null,
      rejected,
      searchConfigured: true,
      searchQuery,
      costNote: DISCOVERY_COST_NOTE,
    };
  }

  return {
    status: "found",
    candidate: {
      url: best.url,
      domain: best.domain,
      confidence: best.confidence,
      reason: best.reason,
      score: best.score,
      title: search.results.find((item) => item.url === best.url)?.title,
    },
    rejected,
    searchConfigured: true,
    searchQuery,
    costNote: DISCOVERY_COST_NOTE,
  };
}

export function buildWebsiteDiscoveryCacheKey(
  input: DiscoverCompanyWebsiteInput,
): string {
  return [
    input.companyName.trim().toLowerCase(),
    input.country?.trim().toLowerCase() ?? "",
    input.roleTitle?.trim().toLowerCase() ?? "",
    input.jobDescriptionText?.trim().slice(0, 200).toLowerCase() ?? "",
    input.confidentialPosting ? "confidential" : "",
    input.companyWebsiteInput?.trim().toLowerCase() ?? "",
    input.outputMode ?? "",
  ].join("|");
}
