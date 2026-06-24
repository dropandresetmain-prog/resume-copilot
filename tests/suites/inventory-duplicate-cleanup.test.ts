import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildActiveCollatedInventory } from "../../src/lib/inventory/active-collated";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import {
  detectInventoryDuplicateGroups,
  listActiveInventoryDuplicateGroups,
  scoreDuplicateBulletPair,
} from "../../src/lib/inventory/duplicate-detection";
import {
  keepBothInventoryDuplicateGroup,
  keepOneInventoryDuplicateBullet,
} from "../../src/lib/inventory/edits";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";

const sampleJd: StoredJobDescription = {
  id: "jd-dup",
  rawText: "Product manager with revenue growth and CRM experience.",
  companyName: "Acme",
  roleTitle: "PM",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function buildSociusLikeInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        workExperiences: [
          {
            id: "exp-socius",
            sourceResumeId: "resume-1",
            company: "Socius",
            descriptor: "",
            location: "Singapore",
            role: "Growth Lead",
            dateRange: "2022 - 2024",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "b-rev-1",
                parentId: "exp-socius",
                keyword: "Revenue",
                description:
                  "Grew annual revenue 40% year-over-year through enterprise partnerships",
                rawBulletText:
                  "Grew annual revenue 40% year-over-year through enterprise partnerships",
              },
              {
                id: "b-rev-2",
                parentId: "exp-socius",
                keyword: "Revenue",
                description:
                  "Increased company revenue by 40% YoY via strategic enterprise partner deals",
                rawBulletText:
                  "Increased company revenue by 40% YoY via strategic enterprise partner deals",
              },
              {
                id: "b-crm",
                parentId: "exp-socius",
                keyword: "CRM",
                description: "Built CRM automation workflows for partner onboarding",
                rawBulletText: "Built CRM automation workflows for partner onboarding",
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
  const inventory = buildSociusLikeInventory();
  const collated = buildCollatedInventory(inventory);
  const groups = detectInventoryDuplicateGroups(collated);
  const revenueGroup = groups.find((group) => group.bulletKeys.length >= 2);

  const revenueKey1 = buildBulletEnrichmentKey(
    "Socius",
    "Growth Lead",
    "Grew annual revenue 40% year-over-year through enterprise partnerships",
  );
  const revenueKey2 = buildBulletEnrichmentKey(
    "Socius",
    "Growth Lead",
    "Increased company revenue by 40% YoY via strategic enterprise partner deals",
  );
  const crmKey = buildBulletEnrichmentKey(
    "Socius",
    "Growth Lead",
    "Built CRM automation workflows for partner onboarding",
  );

  const pairScore = scoreDuplicateBulletPair(
    "Grew annual revenue 40% year-over-year through enterprise partnerships",
    "Increased company revenue by 40% YoY via strategic enterprise partner deals",
  );

  const unrelatedScore = scoreDuplicateBulletPair(
    "Grew annual revenue 40% year-over-year through enterprise partnerships",
    "Built CRM automation workflows for partner onboarding",
  );

  let edits = keepOneInventoryDuplicateBullet(createEmptyInventoryEdits(), revenueGroup!, revenueKey1);
  const activeAfterKeepOne = buildActiveCollatedInventory({ ...inventory, edits });
  const payloadAfterKeepOne = buildResumeDraftGenerationInput({
    collated: activeAfterKeepOne,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0]!,
  });
  const payloadKeys = payloadAfterKeepOne.experiences.flatMap((experience) =>
    experience.bullets.map((bullet) => bullet.bulletKey),
  );

  edits = keepBothInventoryDuplicateGroup(createEmptyInventoryEdits(), revenueGroup!);
  const activeGroupsAfterKeepBoth = listActiveInventoryDuplicateGroups(collated, edits);

  const inventoryPage = readFileSync(
    join(process.cwd(), "src/components/pages/InventoryPageClient.tsx"),
    "utf8",
  );
  const cleanupPanel = readFileSync(
    join(process.cwd(), "src/components/setup/InventoryDuplicateCleanupPanel.tsx"),
    "utf8",
  );
  const regenerationPanel = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["revenue variants score as duplicate", pairScore.match],
    ["revenue pair shares metrics signal", pairScore.signals.includes("shared_metrics")],
    ["unrelated CRM bullet does not match revenue", !unrelatedScore.match],
    ["detector finds revenue duplicate group", Boolean(revenueGroup)],
    [
      "revenue group contains both revenue bullets",
      revenueGroup?.bulletKeys.includes(revenueKey1) &&
        revenueGroup?.bulletKeys.includes(revenueKey2),
    ],
    [
      "CRM bullet not in revenue duplicate group",
      !revenueGroup?.bulletKeys.includes(crmKey),
    ],
    [
      "keep one hides other revenue bullet from active collated",
      activeAfterKeepOne.experiences[0]?.bullets.length === 2 &&
        !activeAfterKeepOne.experiences[0]?.bullets.some(
          (bullet) =>
            bullet.description.includes("Increased company revenue by 40%"),
        ),
    ],
    [
      "hidden revenue bullet excluded from generation payload",
      payloadKeys.includes(revenueKey1) && !payloadKeys.includes(revenueKey2),
    ],
    ["keep both dismisses duplicate group from active list", activeGroupsAfterKeepBoth.length === 0],
    ["inventory page mounts cleanup panel", inventoryPage.includes("InventoryDuplicateCleanupPanel")],
    [
      "cleanup panel exposes controls",
      cleanupPanel.includes("Keep this one") &&
        cleanupPanel.includes("Hide from generation") &&
        cleanupPanel.includes("Keep both"),
    ],
    [
      "regeneration panel distinguishes apply vs full regenerate",
      regenerationPanel.includes("Apply evidence changes") &&
        regenerationPanel.includes("last resort"),
    ],
    [
      "apply evidence is primary before full regenerate",
      regenerationPanel.indexOf('data-action="apply-evidence-changes"') <
        regenerationPanel.indexOf('data-action="regenerate-full-resume"'),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll inventory duplicate cleanup checks passed.");
}

main();
