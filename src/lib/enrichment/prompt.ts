import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";

export const ENRICHMENT_SYSTEM_INSTRUCTIONS = `You are a resume inventory enrichment assistant.

Rules:
- Use industry-standard resume and job-market keywords.
- Do not invent achievements, metrics, employers, or tools not supported by the bullet text.
- Do not create fake buzzwords.
- Prefer real terms used in strategy, operations, product, finance, partnerships, and technical roles.
- Alternative bullet wording must be derived only from existing bullet content.
- If unsure about a keyword or capability, add a risk warning instead of guessing.
- Identify bullets that appear to be rewordings of the same achievement across resumes.
- Do not merge bullets automatically; only suggest duplicate groups with reasons.

Return valid JSON only.`;

export function buildEnrichmentPrompt(input: EnrichmentInventoryInput): string {
  return `${ENRICHMENT_SYSTEM_INSTRUCTIONS}

Analyze the collated work experience bullets below and return JSON with this shape:
{
  "suggestions": [
    {
      "bulletKey": "string",
      "issueType": "keyword_suggestion | capability_suggestion | alternative_wording | possible_duplicate | risk_warning | other",
      "issueTitle": "string",
      "beforeText": "string",
      "suggestedAfterText": "string | null",
      "suggestedKeywords": ["string"],
      "suggestedCapabilities": ["string"],
      "suggestedRoleTypes": ["string"],
      "changes": ["string"],
      "rationale": "string",
      "riskWarnings": ["string"],
      "duplicateGroupId": "string | null",
      "duplicateReason": "string | null"
    }
  ],
  "duplicateGroups": [
    {
      "id": "string",
      "bulletKeys": ["string"],
      "reason": "string"
    }
  ]
}

Bullets:
${JSON.stringify(input.bullets, null, 2)}`;
}
