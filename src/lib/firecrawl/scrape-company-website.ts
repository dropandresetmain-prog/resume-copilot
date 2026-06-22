import { normalizeCompanyWebsiteUrl } from "@/lib/firecrawl/url";

export const FIRECRAWL_MAX_CONTENT_CHARS = 10_000;
export const FIRECRAWL_TIMEOUT_MS = 30_000;
export const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

export type FirecrawlScrapeResult = {
  success: boolean;
  url: string;
  title?: string;
  markdown?: string;
  text?: string;
  error?: string;
};

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }
  return `${content.slice(0, maxChars)}\n\n[Content truncated for prompt size.]`;
}

export function getFirecrawlApiKey(): string | null {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  return key || null;
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(getFirecrawlApiKey());
}

export async function scrapeCompanyWebsiteWithFirecrawl(
  rawUrl: string,
): Promise<FirecrawlScrapeResult> {
  const url = normalizeCompanyWebsiteUrl(rawUrl);
  if (!url) {
    return {
      success: false,
      url: rawUrl,
      error: "Invalid company website URL.",
    };
  }

  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    return {
      success: false,
      url,
      error: "FIRECRAWL_API_KEY is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: FIRECRAWL_TIMEOUT_MS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        url,
        error: `Firecrawl HTTP ${response.status}: ${body.slice(0, 300)}`,
      };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: {
        markdown?: string;
        metadata?: { title?: string; sourceURL?: string };
      };
      error?: string;
    };

    if (!payload.success) {
      return {
        success: false,
        url,
        error: payload.error ?? "Firecrawl scrape failed.",
      };
    }

    const markdown = payload.data?.markdown?.trim();
    if (!markdown) {
      return {
        success: false,
        url,
        error: "Firecrawl returned no markdown content.",
      };
    }

    const truncated = truncateContent(markdown, FIRECRAWL_MAX_CONTENT_CHARS);

    return {
      success: true,
      url,
      title: payload.data?.metadata?.title,
      markdown: truncated,
      text: truncated,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Firecrawl scrape timed out."
        : error instanceof Error
          ? error.message
          : "Firecrawl scrape failed.";
    return {
      success: false,
      url,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
