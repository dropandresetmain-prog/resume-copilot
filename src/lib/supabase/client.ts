import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabaseConfigError(): string | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    return "NEXT_PUBLIC_SUPABASE_URL is not configured.";
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.";
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return client;
}

export function resetSupabaseClientForTests(): void {
  client = null;
}
