import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/records", "/inventory", "/generate", "/output", "/settings", "/profile", "/resume-preview", "/cover-letter-preview"];
const AUTH_PREFIXES = ["/auth"];

/** Auth routes that must stay reachable while signed in (recovery, callback). */
function isAuthedAuthException(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/reset-password")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  const isAuthRoute = AUTH_PREFIXES.some(p => pathname.startsWith(p));

  // Fast exit — no auth check needed for unrelated routes
  if (!isProtected && !isAuthRoute) return NextResponse.next();

  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Refresh the session cookie on the outgoing response
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT and refreshes the session if needed
  const { data: { user } } = await supabase.auth.getUser();
  const hasSession = Boolean(user);

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasSession && !isAuthedAuthException(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
