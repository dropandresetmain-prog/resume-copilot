import type { CompanyContextGenerationRequest } from "@/types/company-context";

export function buildCompanyContextPrompt(input: CompanyContextGenerationRequest): string {
  const displayName = input.companyName.trim();

  return `You are helping Min Htet prepare application materials for a specific job.

IMPORTANT:
- You do NOT have live web search, scraping, or browsing access.
- Use ONLY the job description and company fields provided below.
- If a website URL is provided, treat it as a clue about the company name/industry — do NOT claim you visited or read the site.
- Clearly distinguish facts stated in the JD from reasonable inferences.
- Mark inferred mission/vision/values as inferred in limitations when not explicit in the JD.
- Do not pretend to know private or unreleased company information.
- Avoid hype and unsupported claims.
- Use real industry language.

Return ONLY valid JSON:
{
  "companyName": string,
  "displayName": string,
  "country": string,
  "website": string | null,
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
Include only if present in JD or reasonably inferable from the company description.
If inferred, say so in limitations.
Do NOT write generic admiration language.

## Company fields
Company name (raw): ${displayName}
Country: ${input.country ?? "Singapore"}
${input.website ? `Website (clue only, not fetched): ${input.website}` : "Website: not provided"}
${input.roleTitle ? `Role title: ${input.roleTitle}` : ""}
${input.additionalInstructions ? `Additional instructions: ${input.additionalInstructions}` : ""}

## Job description
${input.jobDescriptionText}
`;
}

export function promptIncludesCompanyContextRules(prompt: string): boolean {
  return (
    prompt.includes("do NOT have live web search") &&
    prompt.includes("suggestedNarrativeAngles") &&
    prompt.includes("limitations")
  );
}

export function promptAvoidsGenericPraise(prompt: string): boolean {
  return prompt.includes("Do NOT write generic admiration");
}
