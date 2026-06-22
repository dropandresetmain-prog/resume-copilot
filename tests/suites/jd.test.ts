import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import {
  createExportPayload,
  parseImportedInventory,
} from "../../src/lib/inventory/persistence";
import {
  clearJobDescriptionsInList,
  createJobDescriptionFromInput,
  deleteJobDescriptionFromList,
  findDuplicateJobDescription,
  parseStoredJobDescriptions,
  serializeJobDescriptions,
  storedJobDescriptionFromInput,
  upsertJobDescriptionInList,
  validateStoredJobDescription,
} from "../../src/lib/jd/persistence";
import { extractJobMetadataFromText, mergeExtractedJobMetadata } from "../../src/lib/jd/extract-metadata";
import { formatSavedJobLabel } from "../../src/lib/jd/labels";
import {
  generateJobDescriptionSummary,
  getSavedJobPreviewText,
} from "../../src/lib/jd/summary";
import { resolveLandingCtaHref } from "../../src/lib/navigation/landing-cta";
import { parseResumeTextForTest } from "../../src/lib/parser/docx-parser";
import type { InventoryState } from "../../src/types/resume";

function main() {
  const created = createJobDescriptionFromInput({
    rawText: "We are hiring a Product Manager to lead strategy and execution.",
    companyName: "Acme Corp",
    roleTitle: "Product Manager",
    jobUrl: "https://example.com/jobs/pm",
  });

  let list = upsertJobDescriptionInList([], created);
  const serialized = serializeJobDescriptions(list);
  const roundtrip = parseStoredJobDescriptions(serialized);

  const updated = storedJobDescriptionFromInput(
    {
      rawText: "Updated JD text with more detail about the role.",
      companyName: "Acme Corp",
      roleTitle: "Senior Product Manager",
    },
    created,
  );
  list = upsertJobDescriptionInList(list, updated);
  list = deleteJobDescriptionFromList(list, created.id);

  const corruptJson = parseStoredJobDescriptions("{ not valid json");
  const corruptShape = parseStoredJobDescriptions(
    JSON.stringify({ jobDescriptions: [{ id: "bad" }] }),
  );
  const rejectsEmptyRaw = validateStoredJobDescription({
    id: "x",
    rawText: "   ",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const duplicateCandidate = createJobDescriptionFromInput({
    rawText: "  We are hiring a Product Manager to lead strategy and execution. ",
    companyName: "acme corp",
    roleTitle: "product manager",
  });
  const duplicateSource = upsertJobDescriptionInList([], created);
  const duplicateMatch = findDuplicateJobDescription(
    duplicateSource,
    duplicateCandidate,
  );
  const duplicateExcluded = findDuplicateJobDescription(
    duplicateSource,
    duplicateCandidate,
    created.id,
  );

  const sampleInventory: InventoryState = {
    resumes: [
      parseResumeTextForTest(
        "WORK EXPERIENCE\nAcme\nRole\nJan 2020 – Present\n• A: B",
        "r1",
      ),
    ],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
  };
  const exportWithJds = createExportPayload(sampleInventory, duplicateSource);
  const importedWithJds = parseImportedInventory(JSON.stringify(exportWithJds));
  const legacyV2Export = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    inventory: sampleInventory,
  };
  const importedLegacy = parseImportedInventory(JSON.stringify(legacyV2Export));
  const malformedJdExport = {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    inventory: sampleInventory,
    jobDescriptions: [{ id: "bad" }, "nope"],
  };
  const importedMalformedJds = parseImportedInventory(
    JSON.stringify(malformedJdExport),
  );
  const extracted = extractJobMetadataFromText(
    "Senior Product Manager\nAcme Corp\n\nAbout the role\nLead product strategy.",
  );
  const mergedExtract = mergeExtractedJobMetadata(
    { rawText: "Senior Product Manager\nAcme Corp", companyName: "Manual Co", roleTitle: "" },
    extracted,
  );
  const savedLabel = formatSavedJobLabel({
    companyName: "Acme Corp",
    roleTitle: "Product Manager",
    rawText: "ignored",
  });
  const summary = generateJobDescriptionSummary({
    rawText:
      "About the role\nWe are looking for a Product Manager to lead strategy and execution across multiple teams.",
    companyName: "Acme Corp",
    roleTitle: "Product Manager",
  });
  const createdWithSummary = createJobDescriptionFromInput({
    rawText:
      "Senior Engineer\nBuild reliable systems.\nOwn architecture decisions across the platform.",
    companyName: "Beta Inc",
    roleTitle: "Senior Engineer",
  });
  const previewCollapsed = getSavedJobPreviewText({
    rawText: "A".repeat(300),
    summary: "Short stored summary for the card.",
  });
  const landingSignedOut = resolveLandingCtaHref({
    cloudEnabled: true,
    isSignedIn: false,
    hasInventory: false,
  });
  const landingReady = resolveLandingCtaHref({
    cloudEnabled: true,
    isSignedIn: true,
    hasInventory: true,
  });
  const landingNoInventory = resolveLandingCtaHref({
    cloudEnabled: true,
    isSignedIn: true,
    hasInventory: false,
  });

  const checks: [string, boolean][] = [
    ["create jd id", created.id.length > 0],
    ["create jd raw text", created.rawText.includes("Product Manager")],
    ["create jd metadata", created.companyName === "Acme Corp"],
    ["upsert adds jd", roundtrip.jobDescriptions.length === 1],
    ["serialize roundtrip", roundtrip.jobDescriptions[0]?.id === created.id],
    ["update jd text", updated.rawText.startsWith("Updated JD")],
    ["update preserves id", updated.id === created.id],
    ["update preserves createdAt", updated.createdAt === created.createdAt],
    ["update changes updatedAt", updated.updatedAt >= created.updatedAt],
    ["update changes role title", updated.roleTitle === "Senior Product Manager"],
    ["delete jd", list.length === 0],
    ["clear jd list helper", clearJobDescriptionsInList().length === 0],
    ["corrupt json fallback", corruptJson.warning !== null],
    ["corrupt json empty list", corruptJson.jobDescriptions.length === 0],
    ["invalid item fallback", corruptShape.warning !== null],
    ["reject empty raw text", rejectsEmptyRaw === null],
    ["duplicate detection", duplicateMatch?.id === created.id],
    ["duplicate excludes self on edit", duplicateExcluded === undefined],
    ["export schema v3", exportWithJds.schemaVersion === 3],
    ["export includes job descriptions", exportWithJds.jobDescriptions?.length === 1],
    ["import restores job descriptions", importedWithJds.jobDescriptions.length === 1],
    ["import restores inventory", importedWithJds.inventory?.resumes.length === 1],
    ["legacy v2 import works", importedLegacy.inventory?.resumes.length === 1],
    ["legacy v2 import has no jds", importedLegacy.jobDescriptions.length === 0],
    [
      "malformed import jds do not crash",
      importedMalformedJds.inventory?.resumes.length === 1,
    ],
    [
      "malformed import jds warning",
      importedMalformedJds.warning !== null,
    ],
    [
      "malformed import jds skipped",
      importedMalformedJds.jobDescriptions.length === 0,
    ],
    ["extract role from jd text", extracted.roleTitle === "Senior Product Manager"],
    ["extract company from jd text", extracted.companyName === "Acme Corp"],
    [
      "merge metadata keeps manual company",
      mergedExtract.companyName === "Manual Co" && mergedExtract.roleTitle === "Senior Product Manager",
    ],
    ["saved job label company role", savedLabel === "Acme Corp — Product Manager"],
    ["summary includes company role", summary?.includes("Acme Corp — Product Manager") ?? false],
    ["summary generated on create", Boolean(createdWithSummary.summary?.includes("Beta Inc"))],
    ["preview prefers stored summary", previewCollapsed === "Short stored summary for the card."],
    ["landing cta signed out", landingSignedOut === "/setup"],
    ["landing cta ready user", landingReady === "/generate"],
    ["landing cta no inventory", landingNoInventory === "/setup"],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }
}

main();
