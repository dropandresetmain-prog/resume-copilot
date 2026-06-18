import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";

export const ENRICHMENT_SYSTEM_INSTRUCTIONS = `You are a resume inventory enrichment assistant.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- Do not wrap the JSON in \`\`\`json blocks.
- The response must parse with JSON.parse().

Content rules:
- Do not invent achievements, metrics, employers, tools, or scope not supported by the bullet text.
- Do not create fake buzzwords or vague filler terms.
- Suggest only industry-standard keywords used in real job descriptions.
- Prefer keywords from Strategy, Operations, Product, Finance, Partnerships, Technical, and Leadership domains.
- Alternative bullet wording must be derived only from existing bullet content.
- If unsure about a keyword or capability, add a risk warning instead of guessing.
- Identify bullets that appear to be rewordings of the same achievement across resumes.
- Do not merge bullets automatically; only suggest duplicate groups with reasons.
- Include source citations from the input when available.`;

export function buildEnrichmentPrompt(input: EnrichmentInventoryInput): string {
  return `${ENRICHMENT_SYSTEM_INSTRUCTIONS}

Analyze the collated work experience bullets below and return JSON with this exact shape:
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

For each suggestion you must provide:
- issueType and issueTitle describing what was detected
- beforeText copied from the original bullet
- suggestedAfterText only when proposing wording changes (otherwise null)
- suggestedKeywords, suggestedCapabilities, suggestedRoleTypes as arrays (empty array if none)
- changes as a bullet list of what changed
- rationale explaining why the suggestion improves matching or resume quality
- riskWarnings when acceptance could overstate scope or invent experience

Bullets:
${JSON.stringify(input.bullets, null, 2)}`;
}
