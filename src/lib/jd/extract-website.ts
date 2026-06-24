import {
  isJobPostingUrl,
  normalizeCompanyWebsiteUrl,
} from "@/lib/firecrawl/url";

const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s<>"')]+/gi;

export type CompanyWebsiteSource = "provided" | "discovered" | "none";

export type ResolvedCompanyWebsite = {
  website: string | null;
  source: CompanyWebsiteSource;
};

/** Extract the first non–job-posting company URL from free text (e.g. pasted JD). */
export function extractCompanyWebsiteFromText(text: string): string | null {
  const matches = text.match(URL_IN_TEXT_PATTERN) ?? [];

  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?)]+$/g, "");
    const normalized = normalizeCompanyWebsiteUrl(cleaned);
    if (normalized && !isJobPostingUrl(normalized)) {
      return normalized;
    }
  }

  return null;
}

/** Prefer an explicit user-provided website; otherwise extract from JD when high-confidence. */
export function resolveEffectiveCompanyWebsite(options: {
  userProvided?: string;
  jobDescriptionText?: string;
}): ResolvedCompanyWebsite {
  const provided = normalizeCompanyWebsiteUrl(options.userProvided);
  if (provided && !isJobPostingUrl(provided)) {
    return { website: provided, source: "provided" };
  }

  const discovered = extractCompanyWebsiteFromText(options.jobDescriptionText ?? "");
  if (discovered) {
    return { website: discovered, source: "discovered" };
  }

  return { website: null, source: "none" };
}
