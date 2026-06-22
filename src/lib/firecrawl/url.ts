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
