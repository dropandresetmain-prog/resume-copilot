import { createServerClient } from "@supabase/ssr";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { type ResponseCookies } from "next/dist/server/web/spec-extension/cookies";

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

// For use in middleware — reads and writes cookies on the request/response pair.
export function createMiddlewareClient(
  getCookie: (name: string) => string | undefined,
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void,
  deleteCookie: (name: string, options: Record<string, unknown>) => void,
) {
  const { url, anonKey } = supabaseConfig();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        // @supabase/ssr calls getAll; we proxy via the single-get interface available in middleware
        return [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => setCookie(name, value, options));
      },
    },
    cookieOptions: {
      // Expose to Next.js edge runtime
    },
  });
}

// For use in Route Handlers and Server Components — accepts the Next.js cookies() store.
export function createSupabaseServerClient(
  cookieStore: ReadonlyRequestCookies | ResponseCookies,
) {
  const { url, anonKey } = supabaseConfig();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return (cookieStore as ReadonlyRequestCookies).getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            (cookieStore as ResponseCookies).set(name, value, options);
          } catch {
            // ReadonlyRequestCookies (Server Components) cannot be written to — ignore.
          }
        });
      },
    },
  });
}
