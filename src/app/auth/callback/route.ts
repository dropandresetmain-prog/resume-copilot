import { NextResponse } from "next/server";

// Supabase OAuth redirects here after Google sign-in.
// The client-side Supabase JS picks up the token from the URL fragment automatically.
// We just redirect to the right place and let the client handle session storage.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";
  return NextResponse.redirect(new URL(next, url.origin));
}
