import { buildCollatedInventory } from "../src/lib/inventory/collation";
import {
  mockProvider,
  resolveProviderId,
  toEnrichmentApiResponse,
} from "../src/lib/ai/provider";
import { normalizeStoredSuggestion } from "../src/lib/enrichment/normalize";
import { buildEnrichmentInput } from "../src/lib/enrichment/payload";
import {
  createEmptyEnrichmentState,
  mergeEnrichmentResult,
  migrateEnrichmentSuggestions,
  updateSuggestionStatus,
  upsertKeywordBankItem,
} from "../src/lib/enrichment/state";
import {
  createExportPayload,
  enrichInventory,
  parseImportedInventory,
} from "../src/lib/inventory/persistence";
import { parseResumeTextForTest } from "../src/lib/parser/docx-parser";
import type { InventoryState } from "../src/types/resume";

async function main() {
  const resumeTextA = `
WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue by 20%.
• Leadership: Led cross-functional teams.
`;

  const resumeTextB = `
WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue by 20 percent.
• Partnerships: Built strategic alliances.
`;

  const parsedA = parseResumeTextForTest(resumeTextA, "resume-a");
  const parsedB = parseResumeTextForTest(resumeTextB, "resume-b");
  const inventoryBefore: InventoryState = {
    resumes: [parsedA, parsedB],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
  };
  const inventorySnapshot = JSON.stringify(inventoryBefore);
  const collated = buildCollatedInventory(inventoryBefore);
  const input = buildEnrichmentInput(collated);
  const mockResult = await mockProvider.enrichInventory(input);
  const apiResponse = toEnrichmentApiResponse(mockResult);
  const enrichedInventory: InventoryState = {
    ...inventoryBefore,
    enrichment: mergeEnrichmentResult(inventoryBefore.enrichment, apiResponse),
  };
  const keywordSuggestion = enrichedInventory.enrichment.suggestions.find(
    (item) => item.issueType === "keyword_suggestion",
  );
  if (!keywordSuggestion) {
    throw new Error("Expected at least one keyword enrichment suggestion.");
  }

  const accepted = updateSuggestionStatus(
    enrichedInventory.enrichment,
    keywordSuggestion.id,
    "accepted",
  );
  const secondSuggestion = accepted.suggestions.find(
    (item) => item.id !== keywordSuggestion.id && item.status === "pending",
  );
  const rejected = secondSuggestion
    ? updateSuggestionStatus(accepted, secondSuggestion.id, "rejected")
    : accepted;
  const keywordBank = upsertKeywordBankItem(
    rejected.keywordBank,
    "Strategic Planning",
    "ai_suggested",
    true,
  );
  const exportPayload = createExportPayload({
    ...inventoryBefore,
    enrichment: {
      ...rejected,
      keywordBank,
    },
  });
  const imported = parseImportedInventory(JSON.stringify(exportPayload));
  const inventoryAfter = JSON.stringify(inventoryBefore);

  const legacySuggestion = normalizeStoredSuggestion({
    id: "legacy-1",
    bulletKey: "acme::pm::growth",
    company: "Acme Corp",
    role: "Product Manager",
    bulletDescription: "Growth: Increased revenue by 20%.",
    suggestedKeywords: ["Revenue Growth"],
    suggestedCapabilities: [],
    suggestedRoleTypes: [],
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  const migratedLegacy = migrateEnrichmentSuggestions([
    {
      id: "legacy-1",
      bulletKey: "acme::pm::growth",
      company: "Acme Corp",
      role: "Product Manager",
      bulletDescription: "Growth: Increased revenue by 20%.",
      suggestedKeywords: ["Revenue Growth"],
      suggestedCapabilities: [],
      suggestedRoleTypes: [],
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ]);

  const checks: [string, boolean][] = [
    ["mock provider id", mockResult.providerId === "mock"],
    ["api response provider metadata", apiResponse.provider === "mock"],
    ["api response isMock flag", apiResponse.isMock === true],
    ["api response provider label", apiResponse.providerLabel === "Mock enrichment"],
    ["mock suggestions generated", mockResult.suggestions.length >= 2],
    ["mock duplicate groups", mockResult.duplicateGroups.length >= 1],
    [
      "mock suggestions include review fields",
      mockResult.suggestions.every(
        (item) =>
          Boolean(item.issueType) &&
          Boolean(item.issueTitle) &&
          Boolean(item.beforeText) &&
          item.changes.length > 0 &&
          Boolean(item.rationale),
      ),
    ],
    [
      "mock keyword suggestion has keywords",
      mockResult.suggestions.some(
        (item) =>
          item.issueType === "keyword_suggestion" &&
          item.suggestedKeywords.length > 0,
      ),
    ],
    ["provider resolves mock", resolveProviderId("mock") === "mock"],
    ["provider defaults to mock", resolveProviderId(undefined) === "mock"],
    [
      "merge stores provider metadata",
      enrichedInventory.enrichment.isMockProvider === true &&
        enrichedInventory.enrichment.providerId === "mock",
    ],
    [
      "merge creates pending suggestions",
      enrichedInventory.enrichment.suggestions.every(
        (item) => item.status === "pending",
      ),
    ],
    [
      "accept keyword suggestion adds approved keyword",
      accepted.keywordBank.some((item) => item.approved),
    ],
    [
      "reject preserves suggestion",
      secondSuggestion
        ? rejected.suggestions.some((item) => item.status === "rejected")
        : true,
    ],
    ["legacy suggestion normalizes", legacySuggestion?.beforeText.includes("Growth") ?? false],
    [
      "legacy migration does not crash",
      migratedLegacy.length === 1 && migratedLegacy[0]?.beforeText.includes("Growth"),
    ],
    ["export schema v2", exportPayload.schemaVersion === 2],
    [
      "export includes enrichment",
      exportPayload.inventory.enrichment.suggestions.length >= 2,
    ],
    [
      "import preserves enrichment",
      (imported.inventory?.enrichment.suggestions.length ?? 0) >= 2,
    ],
    [
      "import preserves keyword bank",
      (imported.inventory?.enrichment.keywordBank.length ?? 0) >= 1,
    ],
    [
      "import migrates legacy review fields",
      (imported.inventory?.enrichment.suggestions[0]?.issueTitle?.length ?? 0) > 0,
    ],
    ["raw inventory not mutated", inventorySnapshot === inventoryAfter],
    [
      "enrichInventory keeps resume count",
      enrichInventory(inventoryBefore).resumes.length ===
        inventoryBefore.resumes.length,
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
