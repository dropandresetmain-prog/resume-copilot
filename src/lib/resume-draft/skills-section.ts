import type { ResumeDraftContent } from "@/types/resume-draft";

const TECH_ITEM_PATTERN =
  /\b(python|javascript|typescript|sql|excel|aws|azure|gcp|git|react|node\.?js|java|sap|hubspot|salesforce|tableau|power bi|machine learning|\bai\b|llm|openai|docker|kubernetes|html|css|c\+\+|\.net|\bapi\b|figma|notion|google apps|microsoft office|vba|\br\b|stata|matlab|looker|snowflake|databricks|jira|confluence|zendesk|slack|asana|airtable|wordpress|shopify|stripe|quickbooks|xero|copilot|cursor|programming|software development|data analytics)\b/i;

export function isTechSkillItem(text: string): boolean {
  return TECH_ITEM_PATTERN.test(text.trim());
}

export function extractSkillsTechLanguagesInterests(content: ResumeDraftContent): {
  techLine: string;
  skillsLine: string;
  languagesLine: string;
  interestsLine: string;
} {
  const groups = content.skills.groups;
  const techGroup = groups.find((group) => /^tech$/i.test(group.label.trim()));
  const skillsGroup =
    groups.find((group) => /^skills$/i.test(group.label.trim())) ??
    groups.find(
      (group) =>
        /skill/i.test(group.label) &&
        !/interest|language|tech/i.test(group.label),
    );
  const languagesGroup = groups.find((group) => /language/i.test(group.label));
  const interestsGroup = groups.find((group) => /interest/i.test(group.label));

  let techItems = [...(techGroup?.items.filter(Boolean) ?? [])];
  let skillsItems = [...(skillsGroup?.items.filter(Boolean) ?? [])];

  if (techItems.length === 0 && skillsItems.length > 0) {
    techItems = skillsItems.filter(isTechSkillItem);
    skillsItems = skillsItems.filter((item) => !isTechSkillItem(item));
  }

  const languagesItems = languagesGroup?.items.filter(Boolean) ?? [];
  const interestsItems =
    interestsGroup?.items.filter(Boolean) ??
    groups
      .filter(
        (group) =>
          group !== techGroup &&
          group !== skillsGroup &&
          group !== languagesGroup,
      )
      .flatMap((group) => group.items)
      .filter(Boolean);

  return {
    techLine: techItems.join(", "),
    skillsLine: skillsItems.join(", "),
    languagesLine: languagesItems.join(", "),
    interestsLine: interestsItems.join(", "),
  };
}
