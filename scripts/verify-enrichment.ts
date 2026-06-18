import { buildCollatedInventory } from "../src/lib/inventory/collation";
import {
  getProviderStatus,
  mockProvider,
  resolveProviderId,
  toEnrichmentApiResponse,
} from "../src/lib/ai/provider";
import { parseEnrichmentJson } from "../src/lib/ai/parse-enrichment-response";
import {
  selectSmallBatchBullets,
  SMALL_BATCH_DEFAULT_SIZE,
} from "../src/lib/enrichment/batch";
import { normalizeStoredSuggestion } from "../src/lib/enrichment/normalize";
import { buildEnrichmentInput } from "../src/lib/enrichment/payload";
import {
  applyTestBatchResult,
  createEmptyEnrichmentState,
  filterIncrementalEnrichmentInput,
  getEnrichmentReviewStats,
  mergeEnrichmentResult,
  mergeTestBatchIntoMain,
  migrateEnrichmentSuggestions,
  resolveSuggestionResolution,
  shouldSkipBulletForEnrichment,
  updateSuggestionStatus,
  upsertKeywordBankItem,
} from "../src/lib/enrichment/state";
import { hashEnrichmentSourceText } from "../src/lib/enrichment/source-hash";
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
  const apiResponse = toEnrichmentApiResponse(mockResult, {
    batchMode: "full",
    bulletsSent: input.bullets.length,
  });
  const smallBatchInput = selectSmallBatchBullets(input);
  const testApiResponse = toEnrichmentApiResponse(
    await mockProvider.enrichInventory(smallBatchInput),
    {
      batchMode: "small_batch_test",
      bulletsSent: smallBatchInput.bullets.length,
    },
  );
  const testOnlyState = applyTestBatchResult(
    createEmptyEnrichmentState(),
    testApiResponse,
  );
  const mergedFromTest = mergeTestBatchIntoMain(testOnlyState);
  const invalidJson = parseEnrichmentJson("```json\n{ broken ```");
  const providerStatus = getProviderStatus();
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

  const wordingSuggestion = enrichedInventory.enrichment.suggestions.find(
    (item) => item.issueType === "alternative_wording",
  );
  const keptExisting = wordingSuggestion
    ? resolveSuggestionResolution(
        enrichedInventory.enrichment,
        wordingSuggestion.id,
        "keep_existing",
      )
    : enrichedInventory.enrichment;
  const usedSuggestion = wordingSuggestion
    ? resolveSuggestionResolution(
        keptExisting,
        wordingSuggestion.id,
        "use_suggestion",
      )
    : keptExisting;
  const ignoredSuggestion = enrichedInventory.enrichment.suggestions.find(
    (item) => item.issueType === "capability_suggestion",
  );
  const ignored = ignoredSuggestion
    ? resolveSuggestionResolution(
        enrichedInventory.enrichment,
        ignoredSuggestion.id,
        "ignored",
      )
    : enrichedInventory.enrichment;
  const rejectedResolution = ignoredSuggestion
    ? resolveSuggestionResolution(
        ignored,
        ignoredSuggestion.id,
        "rejected",
      )
    : ignored;
  const reviewedState = {
    ...rejected,
    suggestions: rejected.suggestions.map((item) =>
      item.id === keywordSuggestion.id
        ? { ...item, status: "accepted" as const, resolution: "use_suggestion" as const }
        : item,
    ),
  };
  const remerged = mergeEnrichmentResult(reviewedState, apiResponse);
  const reviewedWithHashes = {
    ...reviewedState,
    enrichedBulletHashes: Object.fromEntries(
      input.bullets.map((bullet) => [
        bullet.bulletKey,
        hashEnrichmentSourceText(bullet.description),
      ]),
    ),
  };
  const incrementalInput = filterIncrementalEnrichmentInput(input, reviewedWithHashes);
  const skipUnchanged = input.bullets.some((bullet) =>
    shouldSkipBulletForEnrichment(bullet, reviewedWithHashes),
  );
  const stats = getEnrichmentReviewStats(reviewedState);
  const duplicateKeywordBank = upsertKeywordBankItem(
    reviewedState.keywordBank,
    keywordSuggestion.suggestedKeywords[0] ?? "Revenue Growth",
    "ai_suggested",
    true,
  );
  const duplicateKeywordCount = duplicateKeywordBank.filter(
    (item) =>
      item.keyword.toLowerCase() ===
      (keywordSuggestion.suggestedKeywords[0] ?? "revenue growth").toLowerCase(),
  ).length;

  const checks: [string, boolean][] = [
    ["mock provider id", mockResult.providerId === "mock"],
    ["api response provider metadata", apiResponse.provider === "mock"],
    ["api response isMock flag", apiResponse.isMock === true],
    ["api response provider label", apiResponse.providerLabel === "Mock enrichment"],
    [
      "api response batch metadata",
      apiResponse.batchMode === "full" &&
        apiResponse.bulletsSent === input.bullets.length &&
        apiResponse.suggestionsReturned === mockResult.suggestions.length,
    ],
    [
      "small batch limits bullets",
      smallBatchInput.bullets.length <= SMALL_BATCH_DEFAULT_SIZE &&
        smallBatchInput.bullets.length <= input.bullets.length &&
        smallBatchInput.bullets.length > 0,
    ],
    [
      "test batch stored separately",
      testOnlyState.suggestions.length === 0 &&
        (testOnlyState.testBatch?.suggestions.length ?? 0) > 0,
    ],
    [
      "test batch merge adds main suggestions",
      mergedFromTest.suggestions.length > 0 && mergedFromTest.testBatch === undefined,
    ],
    ["invalid json handled safely", invalidJson.ok === false],
    ["provider status defaults mock", providerStatus.provider === "mock"],
    ["provider status configured mock", providerStatus.configured === true],
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
    ["export schema v3", exportPayload.schemaVersion === 3],
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
    [
      "keep existing does not add keywords",
      wordingSuggestion
        ? keptExisting.keywordBank.length === enrichedInventory.enrichment.keywordBank.length
        : true,
    ],
    [
      "use suggestion stores derived wording",
      wordingSuggestion
        ? Boolean(
            usedSuggestion.suggestions.find((item) => item.id === wordingSuggestion.id)
              ?.acceptedWording,
          )
        : true,
    ],
    [
      "use suggestion does not mutate parsed resumes",
      inventorySnapshot === JSON.stringify(inventoryBefore),
    ],
    [
      "reject marks rejected resolution",
      ignoredSuggestion
        ? rejectedResolution.suggestions.some(
            (item) =>
              item.id === ignoredSuggestion.id &&
              item.status === "rejected" &&
              item.resolution === "rejected",
          )
        : true,
    ],
    [
      "ignore marks ignored resolution",
      ignoredSuggestion
        ? ignored.suggestions.some(
            (item) =>
              item.id === ignoredSuggestion.id &&
              item.status === "ignored" &&
              item.resolution === "ignored",
          )
        : true,
    ],
    [
      "incremental input skips unchanged reviewed bullets",
      skipUnchanged && incrementalInput.bullets.length < input.bullets.length,
    ],
    [
      "merge does not duplicate reviewed suggestions",
      remerged.suggestions.filter((item) => item.id === keywordSuggestion.id).length === 1,
    ],
    [
      "approved keywords are not duplicated",
      duplicateKeywordCount === 1,
    ],
    [
      "review stats include counts",
      stats.approvedKeywords >= 1 && stats.rejectedSuggestions >= 0,
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
