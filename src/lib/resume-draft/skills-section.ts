import type { ResumeDraftContent } from "@/types/resume-draft";

const TECHNICAL_SKILL_PATTERN =
  /\b(python|javascript|typescript|sql|excel|aws|azure|gcp|git\/?github|github|react|node\.?js|next\.?js|java|sap|hubspot|salesforce|tableau|power bi|machine learning|\bai\b|llm|openai|docker|kubernetes|html|css|c\+\+|\.net|\bapi\b|figma|notion|google apps|microsoft office|vba|\br\b|stata|matlab|looker|snowflake|databricks|jira|confluence|zendesk|slack|asana|airtable|wordpress|shopify|stripe|quickbooks|xero|copilot|cursor|programming|software development|data analytics|data analysis|workflow automation|crm systems?|\bcrm\b|ai-assisted development)\b/i;

const SOFT_BUSINESS_SKILL_PATTERN =
  /\b(business development|relationship building|consulting|negotiation|market entry(?: strategy)?|partnership management|revenue optimization|stakeholder (?:engagement|management)|strategy & operations)\b/i;

export function isSoftBusinessSkillItem(text: string): boolean {
  return SOFT_BUSINESS_SKILL_PATTERN.test(text.trim());
}

export function isTechnicalSkillItem(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isSoftBusinessSkillItem(trimmed)) {
    return false;
  }
  return TECHNICAL_SKILL_PATTERN.test(trimmed);
}

/** @deprecated Use isTechnicalSkillItem */
export function isTechSkillItem(text: string): boolean {
  return isTechnicalSkillItem(text);
}

export function normalizeTechnicalSkillLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^python\b/i.test(trimmed)) {
    return "Python";
  }
  return trimmed;
}

function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function findSkillsGroup(content: ResumeDraftContent) {
  const groups = content.skills.groups;
  return (
    groups.find((group) => /^skills$/i.test(group.label.trim())) ??
    groups.find(
      (group) =>
        /skill/i.test(group.label) &&
        !/interest|language|tech/i.test(group.label),
    )
  );
}

export function extractSkillsLanguagesInterests(content: ResumeDraftContent): {
  skillsLine: string;
  languagesLine: string;
  interestsLine: string;
} {
  const groups = content.skills.groups;
  const techGroup = groups.find((group) => /^tech$/i.test(group.label.trim()));
  const skillsGroup = findSkillsGroup(content);
  const languagesGroup = groups.find((group) => /language/i.test(group.label));
  const interestsGroup = groups.find((group) => /interest/i.test(group.label));

  const technicalItems: string[] = [
    ...(techGroup?.items.filter(Boolean) ?? []),
    ...(skillsGroup?.items.filter((item) => isTechnicalSkillItem(item)) ?? []),
  ];

  if (technicalItems.length === 0 && skillsGroup) {
    for (const item of skillsGroup.items.filter(Boolean)) {
      if (isTechnicalSkillItem(item)) {
        technicalItems.push(item);
      }
    }
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
    skillsLine: dedupePreserveOrder(technicalItems.map(normalizeTechnicalSkillLabel)).join(", "),
    languagesLine: languagesItems.join(", "),
    interestsLine: interestsItems.join(", "),
  };
}

/** @deprecated Use extractSkillsLanguagesInterests */
export function extractSkillsTechLanguagesInterests(content: ResumeDraftContent): {
  techLine: string;
  skillsLine: string;
  languagesLine: string;
  interestsLine: string;
} {
  const extracted = extractSkillsLanguagesInterests(content);
  return {
    techLine: "",
    skillsLine: extracted.skillsLine,
    languagesLine: extracted.languagesLine,
    interestsLine: extracted.interestsLine,
  };
}
