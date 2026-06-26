import { type NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/records", "/inventory", "/generate", "/output", "/settings", "/profile", "/resume-preview", "/cover-letter-preview"];
// Auth routes — redirect away if already signed in
const AUTH_PREFIXES = ["/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detect Supabase session cookie (set by Supabase JS when using cookie storage)
  // The cookie name follows the pattern: sb-<project-ref>-auth-token
  const cookies = request.cookies;
  const hasSession = [...cookies.getAll()].some(
    c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && c.value,
  );

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  const isAuthRoute = AUTH_PREFIXES.some(p => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
