import type { InventoryTextExtractionRequest } from "@/types/inventory-text-extraction";

export const INVENTORY_TEXT_EXTRACTION_SYSTEM_INSTRUCTIONS = `You extract structured career inventory suggestions from pasted free text.

Critical output rules:
- Return strict JSON only. No markdown, no code fences, no commentary outside JSON.
- The response must parse with JSON.parse().

Content rules:
- Do NOT invent achievements, metrics, employers, tools, dates, or scope not supported by the pasted text.
- Do NOT fabricate content to fill gaps. If the pasted text is too thin to extract meaningful suggestions, set sufficient=false.
- Preserve uncertainty as warnings on individual suggestions.
- Use existingExperiences ONLY to match bullets to known company/role pairs — never to invent bullet content.
- When a bullet clearly belongs to an existing company/role, set matchLabel to "add_to_existing" and include mappedExperienceKey.
- When text describes a new employer/role not in existingExperiences, use kind "new_work_experience" or "bullet_new_experience" with matchLabel "new_experience" ONLY for proper jobs, internships, consulting engagements, or freelance/client work with a real company/client name.
- Personal projects, side projects, portfolio projects, GitHub projects, AI demos, apps, and build projects must use kind "additional_experience" — NEVER "new_work_experience" or "bullet_new_experience".
- Keywords must appear in or be directly implied by the pasted text — no generic filler keywords.
- Education entries require institution or programme text from the paste.
- Split compound pasted notes into atomic suggestions where reasonable.`;

export function buildInventoryTextExtractionPrompt(
  input: InventoryTextExtractionRequest,
): string {
  const experienceIndex =
    input.existingExperiences.length > 0
      ? input.existingExperiences
          .map(
            (item) =>
              `- ${item.company} | ${item.role} (experienceKey: ${item.experienceKey})`,
          )
          .join("\n")
      : "(none — user has no uploaded work experience yet)";

  return `${INVENTORY_TEXT_EXTRACTION_SYSTEM_INSTRUCTIONS}

Analyze the pasted text below and return JSON with this exact shape:
{
  "sufficient": true,
  "insufficientReason": "string | null",
  "warnings": ["string"],
  "suggestions": [
    {
      "kind": "new_work_experience | bullet_existing_experience | bullet_new_experience | skill | education | additional_experience | keyword",
      "text": "string",
      "company": "string | null",
      "role": "string | null",
      "keyword": "string | null",
      "institution": "string | null",
      "dateRange": "string | null",
      "matchLabel": "add_to_existing | new_experience | standalone",
      "mappedExperienceKey": "string | null",
      "warnings": ["string"],
      "sourceNote": "string | null"
    }
  ]
}

Kind guidance:
- new_work_experience: a distinct paid job, internship, consulting engagement, or freelance/client role with a real employer/client name (e.g. "Product Manager at Acme Corp", "Freelance Consultant at ClientCo")
- bullet_existing_experience: achievement bullet for an existing experienceKey
- bullet_new_experience: achievement bullet for a new proper job/client role mentioned in paste — NOT for projects
- skill: individual skill or tool
- education: degree/programme/institution line
- additional_experience: volunteering, personal/side/portfolio/GitHub projects, AI demos, apps, awards, certifications
- keyword: market keyword explicitly present or tightly implied in paste

Project vs job examples (follow exactly):
- WRONG: kind "new_work_experience", company "Projects", role "Resume Copilot" → use additional_experience instead
- WRONG: kind "bullet_new_experience", company "Personal Projects", role "AI Demo" → use additional_experience instead
- RIGHT: kind "additional_experience", text "Resume Copilot: built an AI resume tailoring demo with Gemini"
- RIGHT: kind "new_work_experience", company "ClientCo", role "Freelance Product Consultant", text "Led product discovery for ClientCo"
- RIGHT: kind "new_work_experience", company "Socius", role "Growth Lead", dateRange "2022-2024"

If pasted text has fewer than ~2 substantive facts, set sufficient=false and suggestions=[].

Existing experiences (matching index only):
${experienceIndex}

Pasted text:
"""
${input.pastedText.trim()}
"""`;
}

export function promptForbidsFabrication(prompt: string): boolean {
  return (
    prompt.includes("Do NOT invent") &&
    prompt.includes("Do NOT fabricate") &&
    prompt.includes("sufficient=false")
  );
}

export function promptKeepsProjectsOutOfWorkExperience(prompt: string): boolean {
  return (
    prompt.includes("additional_experience") &&
    prompt.includes('NEVER "new_work_experience"') &&
    prompt.includes("Resume Copilot")
  );
}
