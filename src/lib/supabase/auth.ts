import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Client-side redirect target after Supabase email/OAuth flows complete. */
export function buildAuthCallbackUrl(redirectPath = "/dashboard"): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
}

export async function getCurrentUser(): Promise<User> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("You must be signed in to sync data.");
  }
  return data.user;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInWithMagicLink(
  email: string,
  redirectPath = "/dashboard",
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: buildAuthCallbackUrl(redirectPath) },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: buildAuthCallbackUrl("/auth/reset-password"),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl("/dashboard"),
    },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
