import { generateCompanyContextWithGemini } from "@/lib/ai/company-context-gemini";
import { generateMockCompanyContext } from "@/lib/ai/company-context-mock";
import { parseCompanyContextJson } from "@/lib/company-context/parse";
import type { CompanyContextGenerationRequest } from "@/types/company-context";
import type { CompanyContext, CompanyResearchSource } from "@/types/company-context";
import {
  scrapeCompanyWebsiteWithFirecrawl,
  type FirecrawlScrapeResult,
} from "@/lib/firecrawl/scrape-company-website";
import { resolveCompanyWebsiteForResearch } from "@/lib/firecrawl/url";
import type { AIProviderId } from "@/lib/ai/types";

export type CompanyResearchGenerationResult = CompanyContext & {
  providerId: AIProviderId;
  firecrawlUsed: boolean;
  researchWarning?: string;
};

function buildFirecrawlSource(scrape: FirecrawlScrapeResult): CompanyResearchSource {
  return {
    type: "firecrawl",
    url: scrape.url,
    title: scrape.title,
    retrievedAt: new Date().toISOString(),
    success: scrape.success,
    error: scrape.error,
  };
}

function buildJdSource(): CompanyResearchSource {
  return {
    type: "jd",
    success: true,
    retrievedAt: new Date().toISOString(),
  };
}

function attachSourceMetadata(
  context: CompanyContext,
  options: {
    scrape?: FirecrawlScrapeResult;
    sourceType: CompanyContext["sourceType"];
  },
): CompanyContext {
  const sources: CompanyResearchSource[] = [];

  if (options.scrape) {
    sources.push(buildFirecrawlSource(options.scrape));
  }
  if (options.sourceType === "jd_based_context") {
    sources.push(buildJdSource());
  }

  const limitations = [...context.limitations];
  if (options.scrape?.success) {
    limitations.push(`Website content scraped from ${options.scrape.url} via Firecrawl.`);
  } else if (options.scrape && !options.scrape.success) {
    limitations.push(
      `Website scrape failed (${options.scrape.error ?? "unknown error"}); JD-based fields used where needed.`,
    );
  } else if (options.sourceType === "jd_based_context") {
    limitations.push("JD-based context only — no company website research performed.");
  }

  return {
    ...context,
    sourceType: options.sourceType,
    sources: sources.length > 0 ? sources : context.sources,
    limitations: Array.from(new Set(limitations)),
    website: options.scrape?.url ?? context.website,
  };
}

export async function generateCompanyResearchWithProvider(
  input: CompanyContextGenerationRequest,
  provider: AIProviderId,
  apiKey?: string,
): Promise<CompanyResearchGenerationResult> {
  const companyWebsite = resolveCompanyWebsiteForResearch(input.website);
  let scrape: FirecrawlScrapeResult | undefined;
  let researchWarning: string | undefined;

  if (companyWebsite) {
    if (provider === "mock") {
      scrape = {
        success: true,
        url: companyWebsite,
        title: `${input.companyName} — Mock Website`,
        markdown: `# ${input.companyName}\nMock Firecrawl website content for ${input.companyName}.`,
        text: `Mock Firecrawl website content for ${input.companyName}.`,
      };
    } else {
      scrape = await scrapeCompanyWebsiteWithFirecrawl(companyWebsite);
      if (!scrape.success) {
        researchWarning =
          "Website research failed; using JD-based context. You can retry research later.";
      }
    }
  }

  const promptInput: CompanyContextGenerationRequest = {
    ...input,
    website: companyWebsite ?? input.website,
    websiteScrapeMarkdown: scrape?.success ? scrape.markdown : undefined,
    websiteScrapeTitle: scrape?.success ? scrape.title : undefined,
    researchMode: scrape?.success ? "website_backed" : companyWebsite ? "jd_fallback" : "jd_only",
  };

  let context: CompanyContext;

  if (provider === "gemini") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    context = await generateCompanyContextWithGemini(promptInput, apiKey);
  } else if (provider === "openai") {
    throw new Error("OpenAI company research is not implemented yet.");
  } else {
    context = generateMockCompanyContext(promptInput);
  }

  if (!scrape?.success) {
    return {
      ...attachSourceMetadata(context, {
        scrape,
        sourceType: "jd_based_context",
      }),
      providerId: provider,
      firecrawlUsed: Boolean(scrape),
      researchWarning,
    };
  }

  return {
    ...attachSourceMetadata(context, {
      scrape,
      sourceType: "website_research",
    }),
    providerId: provider,
    firecrawlUsed: true,
    researchWarning,
  };
}

export function parseAndAttachResearchSources(
  rawText: string,
  options: {
    fallback?: { companyName?: string; country?: string; website?: string };
    scrape?: FirecrawlScrapeResult;
    sourceType: CompanyContext["sourceType"];
  },
): CompanyContext {
  const parsed = parseCompanyContextJson(rawText, options.fallback);
  return attachSourceMetadata(parsed, {
    scrape: options.scrape,
    sourceType: options.sourceType,
  });
}
