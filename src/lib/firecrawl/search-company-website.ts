import {
  getFirecrawlApiKey,
  isFirecrawlConfigured,
} from "@/lib/firecrawl/scrape-company-website";
import { normalizeCompanyWebsiteUrl } from "@/lib/firecrawl/url";

export const FIRECRAWL_SEARCH_API_URL = "https://api.firecrawl.dev/v1/search";
export const FIRECRAWL_SEARCH_TIMEOUT_MS = 30_000;
export const FIRECRAWL_SEARCH_DEFAULT_LIMIT = 5;

export type FirecrawlSearchResultItem = {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
};

export type FirecrawlSearchResult = {
  success: boolean;
  results: FirecrawlSearchResultItem[];
  error?: string;
};

export { isFirecrawlConfigured };

export function buildCompanyWebsiteSearchQuery(options: {
  companyName: string;
  country?: string;
  roleTitle?: string;
}): string {
  const company = options.companyName.trim();
  const country = options.country?.trim();
  const role = options.roleTitle?.trim();

  const parts = [`"${company}"`, "official website"];
  if (country) {
    parts.push(country);
  }
  if (role) {
    parts.push(role);
  }
  return parts.join(" ");
}

export async function searchWebWithFirecrawl(
  query: string,
  options?: { limit?: number; scrapeMarkdown?: boolean },
): Promise<FirecrawlSearchResult> {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    return {
      success: false,
      results: [],
      error: "FIRECRAWL_API_KEY is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIRECRAWL_SEARCH_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      query,
      limit: options?.limit ?? FIRECRAWL_SEARCH_DEFAULT_LIMIT,
      ignoreInvalidURLs: true,
    };

    if (options?.scrapeMarkdown) {
      body.scrapeOptions = {
        formats: ["markdown"],
        onlyMainContent: true,
      };
    }

    const response = await fetch(FIRECRAWL_SEARCH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      return {
        success: false,
        results: [],
        error: `Firecrawl search HTTP ${response.status}: ${responseBody.slice(0, 300)}`,
      };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: Array<{
        url?: string;
        title?: string;
        description?: string;
        markdown?: string;
      }>;
      error?: string;
    };

    if (!payload.success) {
      return {
        success: false,
        results: [],
        error: payload.error ?? "Firecrawl search failed.",
      };
    }

    const results: FirecrawlSearchResultItem[] = [];
    for (const item of payload.data ?? []) {
      const url = normalizeCompanyWebsiteUrl(item.url);
      if (!url) {
        continue;
      }
      results.push({
        url,
        title: item.title,
        description: item.description,
        markdown: item.markdown,
      });
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Firecrawl search timed out."
        : error instanceof Error
          ? error.message
          : "Firecrawl search failed.";
    return {
      success: false,
      results: [],
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
