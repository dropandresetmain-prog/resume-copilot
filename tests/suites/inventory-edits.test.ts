import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildActiveCollatedInventory } from "../../src/lib/inventory/active-collated";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import {
  applyInventoryEditsToCollated,
  hideInventoryBullet,
  setInventoryBulletEdit,
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
