"use client";

import { useState } from "react";

import { SetupCard } from "@/components/setup/ui";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  signInWithMagicLink,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";

type AuthPanelProps = {
  user: User | null;
  onAuthChange?: () => void;
};

export function AuthPanel({ user, onAuthChange }: AuthPanelProps) {
  const [mode, setMode] = useState<"sign_in" | "sign_up" | "magic_link">(
    "sign_in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const configError = getSupabaseConfigError();

  async function handleSignOut() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await signOut();
      onAuthChange?.();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error ? signOutError.message : "Sign out failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "magic_link") {
        await signInWithMagicLink(email);
        setMessage("Check your email for a magic sign-in link.");
      } else if (mode === "sign_up") {
        await signUpWithPassword(email, password);
        setMessage("Account created. Check your email if confirmation is required.");
        onAuthChange?.();
      } else {
        await signInWithPassword(email, password);
        setMessage("Signed in.");
        onAuthChange?.();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <SetupCard
        title="Sign in"
        description="Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
      >
        <p className="mt-3 text-sm text-red-700">{configError}</p>
      </SetupCard>
    );
  }

  if (user) {
    return (
      <SetupCard
        title="Signed in"
        description="Your resume inventory, job descriptions, and uploaded files sync through Supabase."
      >
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-700">{user.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </SetupCard>
    );
  }

  return (
    <SetupCard
      title="Sign in"
      description="Sign in to save and sync data across devices. Parsed inventory, saved job descriptions, and original resume files are stored in Supabase."
    >
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Sign in to save and sync data across devices.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="auth-email" className="text-sm font-medium text-zinc-800">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {mode !== "magic_link" ? (
          <div>
            <label
              htmlFor="auth-password"
              className="text-sm font-medium text-zinc-800"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSubmitting
              ? "Working…"
              : mode === "sign_up"
                ? "Create account"
                : mode === "magic_link"
                  ? "Send magic link"
                  : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() =>
              setMode((current) =>
                current === "sign_in"
                  ? "sign_up"
                  : current === "sign_up"
                    ? "magic_link"
                    : "sign_in",
              )
            }
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {mode === "sign_in"
              ? "Use sign up"
              : mode === "sign_up"
                ? "Use magic link"
                : "Use password sign in"}
          </button>
        </div>
      </form>
    </SetupCard>
  );
}
