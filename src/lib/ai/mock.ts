import { bulletsAreSimilar } from "@/lib/inventory/normalize";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import { normalizeSuggestionDraft } from "@/lib/enrichment/normalize";
import type {
  EnrichmentResult,
  EnrichmentSuggestionDraft,
} from "@/types/enrichment";
import type { AIProvider } from "@/lib/ai/types";

const PRODUCT_ARCH_KEYWORDS = [
  "Requirements Gathering",
  "Product Operations",
  "Workflow Design",
  "Business Process Design",
];

function inferKeywordSuggestions(text: string, existingKeyword?: string): string[] {
  const keywords = new Set<string>();
  if (existingKeyword?.trim()) keywords.add(existingKeyword.trim());

  if (/product architecture|requirements|user flow|business rule/i.test(text)) {
    for (const keyword of PRODUCT_ARCH_KEYWORDS) keywords.add(keyword);
  }
  if (/\b(strategy|strategic|roadmap)\b/i.test(text)) keywords.add("Strategic Planning");
  if (/\b(operat|process|workflow)\b/i.test(text)) keywords.add("Operations");
  if (/\b(product|feature|stakeholder)\b/i.test(text)) keywords.add("Product Management");
  if (/\b(revenue|financial|budget)\b/i.test(text)) keywords.add("Financial Analysis");
  if (/\b(partner|alliance)\b/i.test(text)) keywords.add("Partnerships");
  if (/\b(technical|engineer|architect|api)\b/i.test(text)) keywords.add("Technical Execution");
  if (/\b(lead|managed|mentor|team)\b/i.test(text)) keywords.add("Leadership");
  if (/\b(growth|increased|launched|built)\b/i.test(text)) keywords.add("Execution");

  return [...keywords].slice(0, 6);
}

function inferCapabilities(text: string): string[] {
  const capabilities: string[] = [];
  if (/\b(stakeholder|cross-functional|alignment)\b/i.test(text)) {
    capabilities.push("Stakeholder alignment");
  }
  if (/\b(analy|data|insight|metric)\b/i.test(text)) {
    capabilities.push("Data-driven decision making");
  }
  if (/\b(launch|ship|deliver|implement)\b/i.test(text)) {
    capabilities.push("Delivery execution");
  }
  if (/\b(venture|founder|startup|0\s*to\s*1)\b/i.test(text)) {
    capabilities.push("Venture building");
  }
  if (/\b(product architecture|requirements|workflow)\b/i.test(text)) {
    capabilities.push("Product discovery and requirements translation");
  }
  return capabilities.slice(0, 4);
}

function inferRoleTypes(text: string): string[] {
  const roles: string[] = [];
  if (/\b(product)\b/i.test(text)) roles.push("Product Management");
  if (/\b(strategy|consult)\b/i.test(text)) roles.push("Strategy & Operations");
  if (/\b(engineer|technical|architect)\b/i.test(text)) roles.push("Technical Program Management");
  if (/\b(founder|venture)\b/i.test(text)) roles.push("Founder / General Management");
  return roles.length > 0 ? roles.slice(0, 3) : ["General Management"];
}

function buildSharperWording(description: string, keyword?: string): string | undefined {
  const base = keyword
    ? description.replace(new RegExp(`^${keyword}\\s*[:\\-]?\\s*`, "i"), "").trim()
    : description.trim();
  if (!base) return undefined;

  if (/translated operational challenges into technical product requirements/i.test(base)) {
    return `${keyword ? `${keyword}: ` : ""}Translated operational challenges into product requirements, user flows, and business rules for implementation.`;
  }

  if (base.length < 40) return undefined;
  const tightened = base
    .replace(/\bhelped\b/gi, "supported")
    .replace(/\bworked on\b/gi, "led")
    .replace(/\bwas responsible for\b/gi, "owned");
  return tightened !== description ? tightened : undefined;
}

function findDuplicateGroups(input: EnrichmentInventoryInput) {
  const groups: { id: string; bulletKeys: string[]; reason: string }[] = [];
  const assigned = new Set<string>();

  for (const bullet of input.bullets) {
    if (bullet.rawTexts.length > 1) {
      groups.push({
        id: `dup-raw-${bullet.bulletKey.slice(0, 24)}`,
        bulletKeys: [bullet.bulletKey],
        reason:
          "These describe the same achievement with different wording across uploaded resumes.",
      });
      assigned.add(bullet.bulletKey);
    }
  }

  for (let i = 0; i < input.bullets.length; i += 1) {
    const current = input.bullets[i];
    if (assigned.has(current.bulletKey)) continue;

    const matches = input.bullets.filter(
      (bullet, index) =>
        index > i &&
        !assigned.has(bullet.bulletKey) &&
        bulletsAreSimilar(current.description, bullet.description),
    );

    if (matches.length === 0) continue;

    const groupId = `dup-${current.bulletKey.slice(0, 24)}`;
    const bulletKeys = [current.bulletKey, ...matches.map((item) => item.bulletKey)];
    bulletKeys.forEach((key) => assigned.add(key));

    groups.push({
      id: groupId,
      bulletKeys,
      reason:
        "These bullets appear to describe the same achievement with different wording.",
    });
  }

  return groups;
}

function buildSuggestionsForBullet(
  bullet: EnrichmentInventoryInput["bullets"][number],
  duplicateGroupId?: string,
  duplicateReason?: string,
): EnrichmentSuggestionDraft[] {
  const beforeText = bullet.description;
  const suggestedKeywords = inferKeywordSuggestions(beforeText, bullet.keyword);
  const suggestedCapabilities = inferCapabilities(beforeText);
  const suggestedRoleTypes = inferRoleTypes(beforeText);
  const suggestedAfterText = buildSharperWording(beforeText, bullet.keyword);
  const suggestions: EnrichmentSuggestionDraft[] = [];

  const keywordTitle =
    /product architecture|requirements|user flow/i.test(beforeText)
      ? "Keyword could be expanded for ATS matching"
      : "Keyword could be more industry-standard";

  suggestions.push(
    normalizeSuggestionDraft({
      bulletKey: bullet.bulletKey,
      bulletId: bullet.bulletId,
      company: bullet.company,
      role: bullet.role,
      issueType: "keyword_suggestion",
      issueTitle: keywordTitle,
      beforeText,
      suggestedKeywords,
      suggestedCapabilities,
      suggestedRoleTypes,
      changes: [
        "Added industry-standard keyword alternatives",
        "Preserved original bullet wording",
      ],
      rationale:
        "These terms are commonly used in product, operations, and strategy job descriptions and map to the same underlying experience.",
      riskWarnings: [
        "No factual risk if used only as tags. Do not rewrite the bullet unless the original scope supports it.",
      ],
      sourceCitations: bullet.sourceCitations,
      duplicateGroupId,
      duplicateReason,
    }),
  );

  if (suggestedCapabilities.length > 0) {
    suggestions.push(
      normalizeSuggestionDraft({
        bulletKey: bullet.bulletKey,
        bulletId: bullet.bulletId,
        company: bullet.company,
        role: bullet.role,
        issueType: "capability_suggestion",
        issueTitle: "Capability tags could improve matching",
        beforeText,
        suggestedKeywords: [],
        suggestedCapabilities,
        suggestedRoleTypes,
        changes: ["Suggested capability tags derived from the bullet text"],
        rationale:
          "Capability tags help group achievements for later resume assembly without changing the source bullet.",
        riskWarnings: [
          "Accept only if the capability accurately reflects work you actually performed.",
        ],
        sourceCitations: bullet.sourceCitations,
      }),
    );
  }

  if (suggestedAfterText && suggestedAfterText !== beforeText) {
    suggestions.push(
      normalizeSuggestionDraft({
        bulletKey: bullet.bulletKey,
        bulletId: bullet.bulletId,
        company: bullet.company,
        role: bullet.role,
        issueType: "alternative_wording",
        issueTitle: "Bullet wording can be sharper",
        beforeText,
        suggestedAfterText,
        suggestedKeywords: [],
        suggestedCapabilities: [],
        suggestedRoleTypes: [],
        changes: [
          "Tightened phrasing while keeping the same scope",
          "Did not add new metrics or achievements",
        ],
        rationale:
          "A clearer wording can improve scanability while staying faithful to the original bullet.",
        riskWarnings: [
          "Reject if the suggested wording implies broader ownership or impact than the original bullet.",
        ],
        sourceCitations: bullet.sourceCitations,
      }),
    );
  }

  if (duplicateGroupId) {
    suggestions.push(
      normalizeSuggestionDraft({
        bulletKey: bullet.bulletKey,
        bulletId: bullet.bulletId,
        company: bullet.company,
        role: bullet.role,
        issueType: "possible_duplicate",
        issueTitle: "Possible duplicate / variant",
        beforeText,
        suggestedKeywords: [],
        suggestedCapabilities: [],
        suggestedRoleTypes: [],
        changes: ["Flagged similar achievement wording across uploaded resumes"],
        rationale:
          duplicateReason ??
          "These bullets may describe the same achievement with different wording.",
        riskWarnings: [
          "Keep all variants only if each wording reflects a genuinely distinct source resume context.",
        ],
        sourceCitations: bullet.sourceCitations,
        duplicateGroupId,
        duplicateReason,
      }),
    );
  }

  if (
    !/\d+%|\$\d|percent/i.test(beforeText) &&
    /\b(increased|grew|reduced|improved)\b/i.test(beforeText)
  ) {
    suggestions.push(
      normalizeSuggestionDraft({
        bulletKey: bullet.bulletKey,
        bulletId: bullet.bulletId,
        company: bullet.company,
        role: bullet.role,
        issueType: "risk_warning",
        issueTitle: "Review impact language before accepting",
        beforeText,
        suggestedKeywords: [],
        suggestedCapabilities: [],
        suggestedRoleTypes: [],
        changes: ["Highlighted impact language without explicit metrics in source text"],
        rationale:
          "Impact verbs can read stronger than the evidence in the original bullet if no metric is present.",
        riskWarnings: [
          "Do not accept if this implies quantified impact beyond what the source bullet states.",
        ],
        sourceCitations: bullet.sourceCitations,
      }),
    );
  }

  return suggestions;
}

export const mockProvider: AIProvider = {
  id: "mock",

  async enrichInventory(input: EnrichmentInventoryInput): Promise<EnrichmentResult> {
    const duplicateGroups = findDuplicateGroups(input);
    const duplicateByKey = new Map<string, string>();

    for (const group of duplicateGroups) {
      for (const bulletKey of group.bulletKeys) {
        duplicateByKey.set(bulletKey, group.id);
      }
    }

    const suggestions = input.bullets.flatMap((bullet) => {
      const duplicateGroupId = duplicateByKey.get(bullet.bulletKey);
      const group = duplicateGroups.find((item) => item.id === duplicateGroupId);
      return buildSuggestionsForBullet(
        bullet,
        duplicateGroupId,
        group?.reason,
      );
    });

    return {
      suggestions,
      duplicateGroups: duplicateGroups.map((group) => ({
        id: group.id,
        bulletKeys: group.bulletKeys,
        bulletDescriptions: group.bulletKeys.flatMap((key) => {
          const bullet = input.bullets.find((item) => item.bulletKey === key);
          if (!bullet) return [];
          if (bullet.rawTexts.length > 1) return bullet.rawTexts;
          return [bullet.description];
        }),
        reason: group.reason,
      })),
      providerId: "mock",
    };
  },
};
