import type { CompanyContextGenerationRequest } from "@/types/company-context";

export function buildCompanyContextPrompt(input: CompanyContextGenerationRequest): string {
  const displayName = input.companyName.trim();
  const hasWebsiteContent = Boolean(input.websiteScrapeMarkdown?.trim());
  const researchMode = input.researchMode ?? (hasWebsiteContent ? "website_backed" : "jd_only");

  const websiteSection = hasWebsiteContent
    ? `## Company website content (scraped via Firecrawl — treat as primary source for company facts)
Source URL: ${input.website ?? "unknown"}
${input.websiteScrapeTitle ? `Page title: ${input.websiteScrapeTitle}` : ""}

${input.websiteScrapeMarkdown}

Use website content for company facts (products, mission, customers, industry).
Use the JD for role-specific hiring priorities and responsibilities.
Clearly label anything inferred beyond website + JD in limitations.`
    : researchMode === "jd_fallback"
      ? `## Website research
A company website URL was provided but scraping failed or returned no usable content.
Use JD and company fields only. Set sourceType to "jd_based_context".
Do NOT pretend website content was available.`
      : `## Website research
No company website content was scraped. Use JD and company fields only.
Set sourceType to "jd_based_context". Do NOT claim you visited the website.`;

  return `You are helping Min Htet prepare application materials for a specific job.

IMPORTANT:
- Prioritize scraped website content (when provided) over guesses.
- Use the JD for role/hiring context, not for inventing company facts.
- Clearly distinguish website facts from JD facts from inferences.
- Include mission/vision/values only if found on the website or explicit in JD — do not fabricate.
- Mark inferred mission/vision/values in limitations.
- Avoid hype, unsupported claims, and generic admiration language.
- Use real industry language.

Return ONLY valid JSON:
{
  "companyName": string,
  "displayName": string,
  "country": string,
  "website": string | null,
  "sourceType": "website_research" | "jd_based_context" | "manual",
  "sources": [
    {
      "type": "firecrawl" | "jd" | "manual" | "fallback",
      "url": string | null,
      "title": string | null,
      "retrievedAt": string,
      "success": boolean,
      "error": string | null
    }
  ],
  "companySummary": string,
  "industry": string | null,
  "businessModel": string | null,
  "productsAndServices": string[],
  "customers": string[],
  "mission": string | null,
  "vision": string | null,
  "coreValues": string[],
  "likelyHiringPriorities": string[],
  "whyThisRoleMayMatter": string,
  "suggestedNarrativeAngles": [
    {
      "angle": string,
      "relevance": string,
      "supportingStories": string[],
      "avoidOveremphasizing": string[]
    }
  ],
  "confidence": "low" | "medium" | "high",
  "limitations": string[],
  "generatedAt": string
}

## Narrative angle guidance
Suggest 2–5 angles from real industry language such as:
Operations & Process Improvement, Stakeholder Management, Payment Operations, Workflow Automation, Product Operations, Market Expansion, Partnerships, Customer Operations, Unit Economics, AI-Assisted Systems.

For each angle:
- explain why it may matter for this company/JD
- suggest which Min Htet story themes may support it (without inventing achievements)
- note what to avoid overemphasizing to prevent founder soup / AI soup

## Mission / vision / values
Include only if present on the website or explicit in the JD.
If inferred, say so in limitations.
Do NOT write generic admiration language.

${websiteSection}

## Company fields
Company name (raw): ${displayName}
Country: ${input.country ?? "Singapore"}
${input.website ? `Company website URL: ${input.website}` : "Company website: not provided"}
${input.roleTitle ? `Role title: ${input.roleTitle}` : ""}
${input.additionalInstructions ? `Additional instructions: ${input.additionalInstructions}` : ""}

## Job description (role / hiring context)
${input.jobDescriptionText}
`;
}

export function promptIncludesCompanyContextRules(prompt: string): boolean {
  return (
    prompt.includes("suggestedNarrativeAngles") &&
    prompt.includes("limitations") &&
    prompt.includes("sourceType")
  );
}

export function promptIncludesWebsiteScrapeContent(prompt: string): boolean {
  return prompt.includes("Company website content (scraped via Firecrawl");
}

export function promptAvoidsGenericPraise(prompt: string): boolean {
  return prompt.includes("generic admiration");
}
