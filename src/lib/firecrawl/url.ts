const JOB_POSTING_HOST_PATTERNS = [
  /(^|\.)linkedin\.com$/i,
  /(^|\.)boards\.greenhouse\.io$/i,
  /(^|\.)jobs\.lever\.co$/i,
  /(^|\.)apply\.workable\.com$/i,
  /(^|\.)workable\.com$/i,
  /(^|\.)indeed\.com$/i,
  /(^|\.)myworkdayjobs\.com$/i,
  /(^|\.)smartrecruiters\.com$/i,
  /(^|\.)jobs\.ashbyhq\.com$/i,
  /(^|\.)glassdoor\.com$/i,
  /(^|\.)jobstreet\.com$/i,
  /(^|\.)jobsdb\.com$/i,
];

const JOB_POSTING_PATH_PATTERNS = [
  /\/jobs?\//i,
  /\/job\//i,
  /\/careers?\/.+\/job/i,
  /\/positions?\//i,
  /\/apply\//i,
];

/** Hosts that are never treated as a company's official homepage for discovery. */
const REJECTED_DISCOVERY_HOST_PATTERNS = [
  /(^|\.)linkedin\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)wikipedia\.org$/i,
  /(^|\.)crunchbase\.com$/i,
  /(^|\.)glassdoor\.com$/i,
  /(^|\.)indeed\.com$/i,
  /(^|\.)monster\.com$/i,
  /(^|\.)ziprecruiter\.com$/i,
  /(^|\.)yelp\.com$/i,
  /(^|\.)trustpilot\.com$/i,
  /(^|\.)bloomberg\.com$/i,
  /(^|\.)reuters\.com$/i,
  /(^|\.)techcrunch\.com$/i,
  /(^|\.)medium\.com$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)pitchbook\.com$/i,
  /(^|\.)zoominfo\.com$/i,
  /(^|\.)dnb\.com$/i,
  /(^|\.)sec\.gov$/i,
  /(^|\.)news\.google\.com$/i,
];

const REJECTED_DISCOVERY_PATH_PATTERNS = [
  /\/news\//i,
  /\/article\//i,
  /\/blog\//i,
  /\/press-release/i,
  /\/wiki\//i,
];

export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Normalize user-entered company website URL. Returns null if invalid. */
export function normalizeCompanyWebsiteUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isHttpUrl(withProtocol)) {
    return null;
  }

  try {
    const parsed = new URL(withProtocol);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isJobPostingUrl(url: string): boolean {
  if (!isHttpUrl(url)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  const host = parsed.hostname.toLowerCase();
  if (JOB_POSTING_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return true;
  }

  const path = `${parsed.pathname}${parsed.search}`;
  return JOB_POSTING_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export function isValidCompanyWebsiteUrl(raw: string | undefined | null): boolean {
  const normalized = normalizeCompanyWebsiteUrl(raw);
  if (!normalized) {
    return false;
  }
  return !isJobPostingUrl(normalized);
}

export function resolveCompanyWebsiteForResearch(
  companyWebsite: string | undefined | null,
): string | null {
  const normalized = normalizeCompanyWebsiteUrl(companyWebsite);
  if (!normalized || isJobPostingUrl(normalized)) {
    return null;
  }
  return normalized;
}

export function extractWebsiteHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Compare two URLs by registrable hostname (www-normalized). */
export function websiteHostnamesMatch(
  left: string | undefined | null,
  right: string | undefined | null,
): boolean {
  const leftHost = left ? extractWebsiteHostname(left) : null;
  const rightHost = right ? extractWebsiteHostname(right) : null;
  if (!leftHost || !rightHost) {
    return false;
  }
  return leftHost === rightHost;
}

export function isRejectedDiscoveryUrl(url: string): boolean {
  if (!isHttpUrl(url) || isJobPostingUrl(url)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  const host = parsed.hostname.toLowerCase();
  if (REJECTED_DISCOVERY_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return true;
  }

  const path = `${parsed.pathname}${parsed.search}`;
  return REJECTED_DISCOVERY_PATH_PATTERNS.some((pattern) => pattern.test(path));
}
