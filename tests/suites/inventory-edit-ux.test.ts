import {
  hideInventoryBullet,
  inventoryEditsEqual,
  setInventoryBulletEdit,
} from "../../src/lib/inventory/edits";
import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";

function main() {
  const bulletKey = buildBulletEnrichmentKey(
    "Drop & Reset",
    "Founder",
    "Hosted 60+ community events",
  );

  let draftEdits = createEmptyInventoryEdits();
  draftEdits = hideInventoryBullet(draftEdits, bulletKey);
  draftEdits = setInventoryBulletEdit(
    draftEdits,
    buildBulletEnrichmentKey("Drop & Reset", "Founder", "Built CRM workflows for partners"),
    "Designed partner CRM automation workflows",
  );

  const savedEdits = createEmptyInventoryEdits();
  const draftAfterTabSwitch = { ...draftEdits };

  const checks: [string, boolean][] = [
    ["inventoryEditsEqual detects no changes", inventoryEditsEqual(savedEdits, savedEdits)],
    ["inventoryEditsEqual detects draft changes", !inventoryEditsEqual(draftEdits, savedEdits)],
    [
      "draft edits survive simulated tab switch",
      inventoryEditsEqual(draftAfterTabSwitch, draftEdits),
    ],
    [
      "saved edits stay empty until explicit save",
      inventoryEditsEqual(savedEdits, createEmptyInventoryEdits()),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll inventory edit UX checks passed.");
}

main();
