import type { SupabaseClient } from "@supabase/supabase-js";

import { enrichInventory, validateInventoryState } from "@/lib/inventory/persistence";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ResumeInventoryRow } from "@/lib/supabase/types";
import type { InventoryState } from "@/types/resume";
import { INVENTORY_SCHEMA_VERSION } from "@/types/resume";

export type CloudResumeInventory = {
  id: string;
  inventory: InventoryState;
  schemaVersion: string;
  updatedAt: string;
};

function parseInventoryRow(row: ResumeInventoryRow): InventoryState | null {
  const validated = validateInventoryState(row.data);
  return validated ? enrichInventory(validated) : null;
}

/** Server/API: load latest inventory for a user (RLS-scoped supabase client). */
export async function getResumeInventoryForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<InventoryState | null> {
  const { data, error } = await supabase
    .from("resume_inventories")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return parseInventoryRow(data as ResumeInventoryRow);
}

export async function loadResumeInventoryFromCloud(): Promise<CloudResumeInventory | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("resume_inventories")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const row = data as ResumeInventoryRow;
  const inventory = parseInventoryRow(row);
  if (!inventory) {
    throw new Error("Cloud resume inventory data is invalid.");
  }

  return {
    id: row.id,
    inventory,
    schemaVersion: row.schema_version,
    updatedAt: row.updated_at,
  };
}

export async function saveResumeInventoryToCloud(
  inventory: InventoryState,
): Promise<CloudResumeInventory> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const enriched = enrichInventory(inventory);
  const schemaVersion = String(INVENTORY_SCHEMA_VERSION);

  const { data: existing, error: existingError } = await supabase
    .from("resume_inventories")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("resume_inventories")
      .update({
        data: enriched,
        schema_version: schemaVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update cloud resume inventory.");
    }

    const row = data as ResumeInventoryRow;
    return {
      id: row.id,
      inventory: enriched,
      schemaVersion: row.schema_version,
      updatedAt: row.updated_at,
    };
  }

  const { data, error } = await supabase
    .from("resume_inventories")
    .insert({
      user_id: user.id,
      data: enriched,
      schema_version: schemaVersion,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save cloud resume inventory.");
  }

  const row = data as ResumeInventoryRow;
  return {
    id: row.id,
    inventory: enriched,
    schemaVersion: row.schema_version,
    updatedAt: row.updated_at,
  };
}

export async function deleteResumeInventoryFromCloud(): Promise<void> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("resume_inventories")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
