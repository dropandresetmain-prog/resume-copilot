import { buildCollatedInventory } from "@/lib/inventory/collation";
import { applyInventoryEditsToCollated } from "@/lib/inventory/edits";
import type { CollatedInventory } from "@/types/collated";
import type { InventoryState } from "@/types/resume";

/** Raw collated inventory from uploaded resumes (no edit overlay). */
export function buildRawCollatedInventory(inventory: InventoryState): CollatedInventory {
  return buildCollatedInventory(inventory);
}

/** Collated inventory for generation and active display (respects inventory edits). */
export function buildActiveCollatedInventory(inventory: InventoryState): CollatedInventory {
  const collated = buildCollatedInventory(inventory);
  return applyInventoryEditsToCollated(collated, inventory.edits);
}

/** Collated inventory for edit UI — includes hidden bullets for restore. */
export function buildCollatedInventoryForEditing(inventory: InventoryState): CollatedInventory {
  const collated = buildCollatedInventory(inventory);
  return applyInventoryEditsToCollated(collated, inventory.edits, { includeHidden: true });
}
