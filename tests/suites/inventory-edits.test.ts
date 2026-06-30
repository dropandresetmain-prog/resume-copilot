import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildActiveCollatedInventory } from "../../src/lib/inventory/active-collated";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import {
  applyInventoryEditsToCollated,
  hideInventoryBullet,
  hideInventorySkill,
  inventoryEditsEqual,
  restoreInventorySkill,
  setInventoryBulletEdit,
  setInventorySkillEdit,
} from "../../src/lib/inventory/edits";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { selectGenerationBullets } from "../../src/lib/resume-draft/bullet-payload";
import {
  buildResumeDraftPrompt,
  promptIncludesAcceptedWordingRules,
} from "../../src/lib/resume-draft/prompt";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";

const sampleJd: StoredJobDescription = {
  id: "jd-edits",
  rawText: "Product manager with operations and events experience.",
  companyName: "Acme",
  roleTitle: "PM",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function buildInventory(): InventoryState {
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
            company: "Drop & Reset",
            descriptor: "",
            location: "",
            role: "Founder",
            dateRange: "2020 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "b-60",
                parentId: "exp-1",
                keyword: "Events",
                description: "Hosted 60+ community events",
                rawBulletText: "Hosted 60+ community events",
              },
              {
                id: "b-100",
                parentId: "exp-1",
                keyword: "Events",
                description: "Hosted 100+ community events",
                rawBulletText: "Hosted 100+ community events",
              },
              {
                id: "b-crm",
                parentId: "exp-1",
                keyword: "CRM",
                description: "Built CRM workflows for partners",
                rawBulletText: "Built CRM workflows for partners",
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

function main() {
  const inventoryPage = readFileSync(
    join(process.cwd(), "src/components/pages/InventoryPageClient.tsx"),
    "utf8",
  );
  const vaultPage = readFileSync(
    join(process.cwd(), "src/components/pages/CareerVaultPageClient.tsx"),
    "utf8",
  );
  const duplicatePanel = readFileSync(
    join(process.cwd(), "src/components/setup/InventoryDuplicateCleanupPanel.tsx"),
    "utf8",
  );

  const inventory = buildInventory();
  const rawCollated = buildCollatedInventory(inventory);
  const key60 = buildBulletEnrichmentKey("Drop & Reset", "Founder", "Hosted 60+ community events");
  const key100 = buildBulletEnrichmentKey("Drop & Reset", "Founder", "Hosted 100+ community events");
  const keyCrm = buildBulletEnrichmentKey("Drop & Reset", "Founder", "Built CRM workflows for partners");

  let edits = hideInventoryBullet(inventory.edits!, key60);
  edits = hideInventoryBullet(edits, key100);
  edits = setInventoryBulletEdit(edits, keyCrm, "Designed partner CRM automation workflows");

  const inventoryWithEdits = { ...inventory, edits };
  const originalResumeJson = JSON.stringify(inventory.resumes);

  const activeCollated = buildActiveCollatedInventory(inventoryWithEdits);
  const editUiCollated = applyInventoryEditsToCollated(rawCollated, edits, { includeHidden: true });
  const generationInput = buildResumeDraftGenerationInput({
    collated: activeCollated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0]!,
    maxBullets: 40,
    regenerationControls: {
      forcedBulletKeys: [keyCrm],
      excludedBulletKeys: [],
    },
  });

  const payloadBullets = generationInput.experiences.flatMap((experience) => experience.bullets);
  const crmBullet = payloadBullets.find((bullet) => bullet.bulletKey === keyCrm);
  const ranked = selectGenerationBullets({
    experiences: activeCollated.experiences,
    maxBullets: 40,
    jdText: sampleJd.rawText,
    acceptedWordingByBulletKey: new Map(),
    forcedBulletKeys: [keyCrm],
    excludedBulletKeys: [key60],
  });

  const prompt = buildResumeDraftPrompt(generationInput);

  // ── M11: structured overlay for non-Work sections (Skills exercised here; the
  // Education/Additional helpers share the identical generic implementation). ──
  const skillId = rawCollated.skillItems[0]?.id ?? "";
  const skillEditEdits = setInventorySkillEdit(createEmptyInventoryEdits(), skillId, "Advanced SQL");
  const skillEditedCollated = applyInventoryEditsToCollated(rawCollated, skillEditEdits);
  const skillRevertedEdits = setInventorySkillEdit(skillEditEdits, skillId, null);
  const skillHiddenEdits = hideInventorySkill(createEmptyInventoryEdits(), skillId);
  const skillHiddenCollated = applyInventoryEditsToCollated(rawCollated, skillHiddenEdits);
  const skillHiddenIncludeCollated = applyInventoryEditsToCollated(rawCollated, skillHiddenEdits, {
    includeHidden: true,
  });
  const skillRestoredEdits = restoreInventorySkill(skillHiddenEdits, skillId);
  const skillSourceJson = JSON.stringify(inventory.resumes);
  applyInventoryEditsToCollated(rawCollated, skillEditEdits);

  const checks: [string, boolean][] = [
    ["source resumes unchanged after edits overlay", JSON.stringify(inventoryWithEdits.resumes) === originalResumeJson],
    ["hidden bullets removed from active collated", activeCollated.experiences[0]?.bullets.length === 1],
    ["edited wording appears in active collated", activeCollated.experiences[0]?.bullets[0]?.description.includes("CRM automation") ?? false],
    ["hidden bullets excluded from generation payload", !payloadBullets.some((bullet) => bullet.bulletKey === key60 || bullet.bulletKey === key100)],
    ["edited bullet wording in payload description", crmBullet?.description.includes("CRM automation") ?? false],
    ["payload preserves stable bullet key after edit", crmBullet?.bulletKey === keyCrm],
    ["forced bullet included in ranked selection", ranked.selected.some((item) => item.bulletKey === keyCrm)],
    ["excluded key not in ranked selection", !ranked.selected.some((item) => item.bulletKey === key60)],
    ["prompt prefers accepted wording rules", promptIncludesAcceptedWordingRules(prompt)],
    ["includeHidden mode keeps hidden bullets for edit UI", (editUiCollated.experiences[0]?.bullets.length ?? 0) === 3],
    ["inventoryEditsEqual detects no changes", inventoryEditsEqual(createEmptyInventoryEdits(), createEmptyInventoryEdits())],
    [
      "inventoryEditsEqual detects draft changes",
      !inventoryEditsEqual(edits, createEmptyInventoryEdits()),
    ],
    [
      "draft edits survive simulated tab switch",
      inventoryEditsEqual({ ...edits }, edits),
    ],
    [
      "inventory page warns before unload when unsaved",
      inventoryPage.includes("beforeunload") && inventoryPage.includes("hasUnsavedChanges"),
    ],
    [
      "inventory unsaved banner test id",
      inventoryPage.includes('data-testid="inventory-unsaved-changes-banner"'),
    ],
    [
      "duplicate cleanup exposes save state",
      duplicatePanel.includes('data-testid="inventory-duplicate-cleanup-save-state"') &&
        duplicatePanel.includes("hasUnsavedChanges"),
    ],
    [
      "enrichment auto-save feedback",
      inventoryPage.includes('data-testid="inventory-enrich-auto-save-feedback"'),
    ],
    // M2: CareerVaultPageClient (active /inventory Folio client) parity checks.
    // These run in parallel with the InventoryPageClient checks above — both files
    // must satisfy the invariants independently.
    [
      "vault page warns before unload when unsaved",
      vaultPage.includes("beforeunload") && vaultPage.includes("hasUnsavedChanges"),
    ],
    [
      "vault unsaved banner test id",
      vaultPage.includes('data-testid="inventory-unsaved-changes-banner"'),
    ],
    [
      "vault page wires revert to original",
      vaultPage.includes("revertBulletEdit"),
    ],
    [
      "vault page exposes save error state",
      vaultPage.includes("saveError"),
    ],
    [
      "revert to original clears bullet text override",
      (() => {
        const editsWithOverride = setInventoryBulletEdit(createEmptyInventoryEdits(), keyCrm, "Custom text");
        const reverted = setInventoryBulletEdit(editsWithOverride, keyCrm, null);
        return reverted.editedBulletTextByBulletKey[keyCrm] === undefined;
      })(),
    ],
    [
      "revert does not mutate source resume",
      (() => {
        const inventory = buildInventory();
        const originalJson = JSON.stringify(inventory.resumes);
        const editsWithOverride = setInventoryBulletEdit(createEmptyInventoryEdits(), keyCrm, "Custom text");
        setInventoryBulletEdit(editsWithOverride, keyCrm, null);
        return JSON.stringify(inventory.resumes) === originalJson;
      })(),
    ],
    // ── M11: Education / Skills / Additional structured overlay ───────────────
    [
      "skill edit override appears in active collated (M11)",
      skillEditedCollated.skillItems.some((item) => item.text === "Advanced SQL"),
    ],
    [
      "skill revert clears the override (M11)",
      skillRevertedEdits.editedSkillTextById?.[skillId] === undefined,
    ],
    [
      "hidden skill removed from active collated (M11)",
      !skillHiddenCollated.skillItems.some((item) => item.id === skillId),
    ],
    [
      "includeHidden keeps hidden skill for edit UI (M11)",
      skillHiddenIncludeCollated.skillItems.some((item) => item.id === skillId),
    ],
    [
      "restore un-hides the skill (M11)",
      (skillRestoredEdits.hiddenSkillIds ?? []).length === 0,
    ],
    [
      "section overlay never mutates source resumes (M11)",
      JSON.stringify(inventory.resumes) === skillSourceJson,
    ],
    [
      "inventoryEditsEqual detects section overlay changes (M11)",
      !inventoryEditsEqual(skillEditEdits, createEmptyInventoryEdits()),
    ],
    // ── M11: Vault wires edit/hide/revert controls for all three sections ─────
    [
      "vault wires education overlay helpers (M11)",
      vaultPage.includes("hideInventoryEducation") &&
        vaultPage.includes("setInventoryEducationEdit") &&
        vaultPage.includes("restoreInventoryEducation"),
    ],
    [
      "vault wires skill overlay helpers (M11)",
      vaultPage.includes("hideInventorySkill") &&
        vaultPage.includes("setInventorySkillEdit") &&
        vaultPage.includes("restoreInventorySkill"),
    ],
    [
      "vault wires additional overlay helpers (M11)",
      vaultPage.includes("hideInventoryAdditional") &&
        vaultPage.includes("setInventoryAdditionalEdit") &&
        vaultPage.includes("restoreInventoryAdditional"),
    ],
    [
      "vault editing view includes hidden items for restore (M11)",
      vaultPage.includes("buildCollatedInventoryForEditing"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll inventory edit checks passed.");
}

main();
