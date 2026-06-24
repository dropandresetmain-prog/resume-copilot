import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { buildActiveCollatedInventory } from "../../src/lib/inventory/active-collated";
import { buildTextImportBulletKey } from "../../src/lib/inventory/edits";
import { applyAcceptedInventoryTextSuggestions } from "../../src/lib/inventory-text-extraction/apply";
import { flagDuplicateInventoryTextSuggestions } from "../../src/lib/inventory-text-extraction/duplicate-preview";
import { extractInventoryTextWithMock } from "../../src/lib/inventory-text-extraction/mock";
import {
  InventoryTextExtractionParseError,
  parseInventoryTextExtractionJson,
} from "../../src/lib/inventory-text-extraction/parse";
import {
  buildInventoryTextExtractionPrompt,
  promptForbidsFabrication,
} from "../../src/lib/inventory-text-extraction/prompt";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";
import type { InventoryState } from "../../src/types/resume";
import type { ReviewedInventoryTextSuggestion } from "../../src/types/inventory-text-extraction";

function buildSampleInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Acme Corp",
            descriptor: "",
            location: "",
            role: "Product Manager",
            dateRange: "2020 - 2024",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "b-1",
                parentId: "exp-1",
                keyword: "Growth",
                description: "Grew annual revenue 40% through enterprise partnerships",
                rawBulletText: "Grew annual revenue 40% through enterprise partnerships",
              },
            ],
          },
        ],
        education: [],
        additionalExperience: {
          id: "additional-1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "skills-1",
          sourceResumeId: "resume-1",
          languages: [],
          technicalSkills: ["SQL"],
          interests: [],
          other: [],
          rawText: "",
          parseWarnings: [],
        },
        unparsedSections: [],
        parseWarnings: [],
      },
    ],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
    edits: createEmptyInventoryEdits(),
  };
}

function reviewed(
  suggestion: Omit<ReviewedInventoryTextSuggestion, "reviewStatus"> & {
    reviewStatus?: ReviewedInventoryTextSuggestion["reviewStatus"];
  },
): ReviewedInventoryTextSuggestion {
  return {
    ...suggestion,
    reviewStatus: suggestion.reviewStatus ?? "accepted",
  };
}

function main() {
  const inventory = buildSampleInventory();
  const collated = buildCollatedInventory(inventory);
  const experienceKey = "acme corp::product manager";

  const prompt = buildInventoryTextExtractionPrompt({
    pastedText: "Led CRM automation for partner onboarding at Acme Corp.",
    existingExperiences: [
      {
        company: "Acme Corp",
        role: "Product Manager",
        experienceKey,
      },
    ],
  });

  let parseError: InventoryTextExtractionParseError | null = null;
  try {
    parseInventoryTextExtractionJson("{ not json", "mock");
  } catch (error) {
    parseError = error as InventoryTextExtractionParseError;
  }

  const emptyParse = parseInventoryTextExtractionJson(
    JSON.stringify({ sufficient: false, suggestions: [] }),
    "mock",
  );

  const mockExtract = extractInventoryTextWithMock({
    pastedText: [
      "Skills: Python, Stakeholder Management",
      "Keywords: Product Operations, CRM",
      "- Built partner onboarding automation reducing cycle time 30%",
    ].join("\n"),
    existingExperiences: [
      {
        company: "Acme Corp",
        role: "Product Manager",
        experienceKey,
      },
    ],
  });

  const duplicateSuggestion = flagDuplicateInventoryTextSuggestions(
    [
      {
        id: "dup-1",
        kind: "bullet_existing_experience",
        category: "bullets",
        text: "Grew annual revenue 40% through enterprise partnerships",
        company: "Acme Corp",
        role: "Product Manager",
        matchLabel: "add_to_existing",
        mappedExperienceKey: experienceKey,
        warnings: [],
        applyability: "applyable",
      },
    ],
    collated,
  )[0];

  const acceptedBullet = reviewed({
    id: "apply-1",
    kind: "bullet_existing_experience",
    category: "bullets",
    text: "Automated partner onboarding workflows with CRM integrations",
    company: "Acme Corp",
    role: "Product Manager",
    matchLabel: "add_to_existing",
    mappedExperienceKey: experienceKey,
    warnings: [],
    applyability: "applyable",
  });

  const rejectedBullet = reviewed({
    id: "reject-1",
    kind: "bullet_existing_experience",
    category: "bullets",
    text: "Should not apply",
    company: "Acme Corp",
    role: "Product Manager",
    matchLabel: "add_to_existing",
    mappedExperienceKey: experienceKey,
    warnings: [],
    applyability: "applyable",
    reviewStatus: "rejected",
  });

  const acceptedKeyword = reviewed({
    id: "kw-1",
    kind: "keyword",
    category: "keywords",
    text: "Product Operations",
    matchLabel: "standalone",
    warnings: [],
    applyability: "applyable",
  });

  const applyResult = applyAcceptedInventoryTextSuggestions(
    [acceptedBullet, rejectedBullet, acceptedKeyword],
    createEmptyInventoryEdits(),
    inventory.enrichment,
    collated,
  );

  const inventoryWithApplied = {
    ...inventory,
    edits: applyResult.edits,
    enrichment: applyResult.enrichment,
  };
  const activeCollated = buildActiveCollatedInventory(inventoryWithApplied);
  const acmeExperience = activeCollated.experiences.find(
    (item) => item.company === "Acme Corp",
  );
  const importedBullet = acmeExperience?.bullets.find((bullet) =>
    bullet.description.includes("CRM integrations"),
  );

  const inventoryPage = readFileSync(
    join(process.cwd(), "src/components/pages/InventoryPageClient.tsx"),
    "utf8",
  );
  const extractionPanel = readFileSync(
    join(process.cwd(), "src/components/setup/InventoryTextExtractionPanel.tsx"),
    "utf8",
  );
  const apiRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/extract-inventory-from-text/route.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["prompt forbids fabrication", promptForbidsFabrication(prompt)],
    ["prompt references existing experience index only", prompt.includes("matching index only")],
    ["malformed JSON throws parse error", parseError instanceof InventoryTextExtractionParseError],
    ["empty sufficient=false handled safely", !emptyParse.sufficient && emptyParse.suggestions.length === 0],
    ["mock extract returns suggestions", mockExtract.suggestions.length >= 3],
    ["duplicate preview flags similar bullet", Boolean(duplicateSuggestion?.duplicateOfBulletKey)],
    ["accepted bullet applies to overlay", applyResult.appliedCount === 2],
    ["rejected bullet does not apply", applyResult.appliedCount < 3],
    ["imported bullet appears in active collated", Boolean(importedBullet)],
    [
      "imported bullet has stable text-import key",
      Boolean(
        importedBullet?.inventoryBulletKey?.startsWith("text-import::") &&
          importedBullet.inventoryBulletKey ===
            buildTextImportBulletKey("Acme Corp", "Product Manager", importedBullet.id),
      ),
    ],
    ["keyword lands in enrichment bank", applyResult.enrichment.keywordBank.some((item) => item.approved && item.keyword === "Product Operations")],
    ["inventory page wires Add from text", inventoryPage.includes("InventoryTextExtractionPanel")],
    ["panel exposes Add from text CTA", extractionPanel.includes('data-testid="inventory-add-from-text"')],
    ["panel exposes Extract suggestions", extractionPanel.includes('data-testid="inventory-extract-suggestions"')],
    ["panel exposes Apply accepted suggestions", extractionPanel.includes('data-testid="inventory-apply-accepted-suggestions"')],
    ["API route uses shared provider", apiRoute.includes("extractInventoryTextWithAI")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll inventory text extraction checks passed.");
}

main();
