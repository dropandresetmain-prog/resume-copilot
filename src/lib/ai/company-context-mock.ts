import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import type { CompanyContext, CompanyContextGenerationRequest } from "@/types/company-context";

export function generateMockCompanyContext(
  input: CompanyContextGenerationRequest,
): CompanyContext {
  const displayName = normalizeCompanyDisplayName(input.companyName);
  const role = input.roleTitle ?? "this role";
  const hasWebsiteContent = Boolean(input.websiteScrapeMarkdown?.trim());
  const sourceType = hasWebsiteContent ? "website_research" : "jd_based_context";

  return {
    companyName: input.companyName,
    displayName,
    country: input.country ?? "Singapore",
    website: input.website,
    sourceType,
    sources: hasWebsiteContent
      ? [
          {
            type: "firecrawl",
            url: input.website,
            title: input.websiteScrapeTitle,
            retrievedAt: new Date().toISOString(),
            success: true,
          },
        ]
      : [
          {
            type: "jd",
            success: true,
            retrievedAt: new Date().toISOString(),
          },
        ],
    companySummary: hasWebsiteContent
      ? `${displayName} summary based on mock website scrape and JD for ${role}.`
      : `${displayName} appears to be hiring for ${role} based on the pasted job description. The role likely emphasizes operational execution, stakeholder coordination, and practical problem-solving in ${input.country ?? "Singapore"}.`,
    industry: hasWebsiteContent ? "From mock website content" : "Inferred from JD keywords",
    businessModel: hasWebsiteContent ? "From mock website content" : "Inferred from JD — review before using",
    productsAndServices: hasWebsiteContent
      ? ["From mock website scrape"]
      : ["Inferred offering — confirm from JD"],
    customers: hasWebsiteContent ? ["From mock website scrape"] : ["Inferred customer type — confirm from JD"],
    mission: undefined,
    vision: undefined,
    coreValues: [],
    likelyHiringPriorities: [
      "Practical execution and operational reliability",
      "Stakeholder coordination",
      "Role-specific responsibilities from JD",
    ],
    whyThisRoleMayMatter: `The ${role} role likely matters because the company needs someone who can translate messy operational work into dependable execution.`,
    suggestedNarrativeAngles: [
      {
        angle: "Operations & Process Improvement",
        relevance: "Useful if the JD emphasizes workflow, coordination, or execution discipline.",
        supportingStories: ["Small business operations", "Workflow automation prototypes"],
        avoidOveremphasizing: ["Founder positioning jargon", "Unsupported fintech scale claims"],
      },
    ],
    confidence: hasWebsiteContent ? "medium" : "low",
    limitations: hasWebsiteContent
      ? ["Mock provider — simulated Firecrawl website scrape."]
      : [
          "Mock provider — JD-based context only.",
          "No website research performed.",
        ],
    generatedAt: new Date().toISOString(),
  };
}
