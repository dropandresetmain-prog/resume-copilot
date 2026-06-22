import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import type { CompanyContext, CompanyContextGenerationRequest } from "@/types/company-context";

export function generateMockCompanyContext(
  input: CompanyContextGenerationRequest,
): CompanyContext {
  const displayName = normalizeCompanyDisplayName(input.companyName);
  const role = input.roleTitle ?? "this role";

  return {
    companyName: input.companyName,
    displayName,
    country: input.country ?? "Singapore",
    website: input.website,
    companySummary: `${displayName} appears to be hiring for ${role} based on the pasted job description. The role likely emphasizes operational execution, stakeholder coordination, and practical problem-solving in ${input.country ?? "Singapore"}.`,
    industry: "Inferred from JD keywords",
    businessModel: "Inferred from JD — review before using",
    productsAndServices: ["Inferred offering — confirm from JD"],
    customers: ["Inferred customer type — confirm from JD"],
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
      {
        angle: "Stakeholder Management",
        relevance: "Useful when the JD mentions partners, clients, or cross-functional work.",
        supportingStories: ["Consulting-style delivery", "Customer operations"],
        avoidOveremphasizing: ["Senior product authority"],
      },
    ],
    confidence: input.website ? "medium" : "low",
    limitations: [
      "Mock provider — no Gemini call.",
      "No external web research; based on JD and company fields only.",
      "Mission/vision not inferred in mock mode.",
    ],
    generatedAt: new Date().toISOString(),
  };
}
