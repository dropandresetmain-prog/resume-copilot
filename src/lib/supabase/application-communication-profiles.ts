import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ApplicationCommunicationProfileRow } from "@/lib/supabase/types";
import type { ApplicationCommunicationProfile } from "@/types/application-communication-profile";

function mapProfileRow(row: ApplicationCommunicationProfileRow): ApplicationCommunicationProfile {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getApplicationCommunicationProfileFromCloud(): Promise<ApplicationCommunicationProfile | null> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("application_communication_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapProfileRow(data as ApplicationCommunicationProfileRow);
}

export async function saveApplicationCommunicationProfileToCloud(
  content: string,
): Promise<ApplicationCommunicationProfile> {
  const user = await getCurrentUser();
  const supabase = getSupabaseClient();
  const existing = await getApplicationCommunicationProfileFromCloud();

  if (existing) {
    const { data, error } = await supabase
      .from("application_communication_profiles")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update communication profile.");
    }

    return mapProfileRow(data as ApplicationCommunicationProfileRow);
  }

  const { data, error } = await supabase
    .from("application_communication_profiles")
    .insert({
      user_id: user.id,
      content,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save communication profile.");
  }

  return mapProfileRow(data as ApplicationCommunicationProfileRow);
}
