"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (sessionError || !data.user) {
          setHasSession(false);
        } else {
          setHasSession(true);
        }
      } catch {
        if (!cancelled) setHasSession(false);
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionChecked) {
    return (
      <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10">
        <p className="text-center text-[22px] font-bold text-folio-primary mb-2">Folio</p>
        <p className="text-center text-sm text-folio-outline">Verifying reset link…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10">
        <p className="text-center text-[22px] font-bold text-folio-primary mb-2">Folio</p>
        <h1 className="text-center text-[20px] font-medium text-folio-on-surface mb-2">
          Link expired or invalid
        </h1>
        <p className="text-center text-[13px] text-folio-outline mb-6">
          Request a new password reset email and open the link in the same browser.
        </p>
        <Link
          href="/auth/forgot-password"
          className="flex h-11 items-center justify-center rounded-[8px] bg-folio-cta-secondary text-[14px] font-medium text-white hover:opacity-90"
        >
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10">
      <p className="text-center text-[22px] font-bold text-folio-primary mb-2">Folio</p>
      <h1 className="text-center text-[20px] font-medium text-folio-on-surface mb-2">
        Choose a new password
      </h1>
      <p className="text-center text-[13px] text-folio-outline mb-8">
        Enter a new password for your account.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && <p className="text-[12px] text-folio-error">{error}</p>}

        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-folio-on-surface-variant" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-folio-on-surface-variant" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-[8px] bg-folio-cta-secondary text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-1"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
