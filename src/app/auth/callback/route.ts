import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

function safeRedirectPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

// Supabase email links (magic link, password recovery) and OAuth land here with a
// one-time code or token_hash. We must exchange/verify before redirecting — otherwise
// the user keeps an anonymous session and lands on the public homepage.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");
  const origin = requestUrl.origin;

  const config = supabaseConfig();
  if (!config) {
    return NextResponse.redirect(`${origin}/auth/login?error=supabase_not_configured`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
    }
    // OAuth codes always land on dashboard (next defaults to /dashboard)
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp failed:", error.message);
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
    }
    // Type-based dispatch: each email OTP flow has a fixed destination
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
    if (type === "signup" || type === "email_change") {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
    // magic link and other OTP types respect the next param
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
}
