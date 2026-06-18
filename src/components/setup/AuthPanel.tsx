"use client";

import { useState } from "react";

import {
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
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

type AuthMode = "sign_in" | "magic_link" | "sign_up";

type AuthPanelProps = {
  user: User | null;
  onAuthChange?: () => void;
};

const modeTabs: { id: AuthMode; label: string }[] = [
  { id: "sign_in", label: "Password" },
  { id: "magic_link", label: "Magic link" },
  { id: "sign_up", label: "Sign up" },
];

export function AuthPanel({ user, onAuthChange }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const configError = getSupabaseConfigError();

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

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
        setMessage("Check your email for the sign-in link.");
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
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {configError}
        </p>
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
          <p className="text-sm text-slate-700">{user.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting}
            className={secondaryButtonClassName}
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
      description="Sign in to save and sync data across devices. Use password or magic link — no password required for magic link accounts."
    >
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
      >
        {modeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => switchMode(tab.id)}
            className={`rounded-md px-2 py-2.5 text-sm font-medium transition ${
              mode === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "magic_link" ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          No password needed. Enter your email and we will send a one-time sign-in
          link. Use this if you signed up with magic link only.
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sign in to save and sync data across devices.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="auth-email" className={labelClassName}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={formFieldClassName}
          />
        </div>

        {mode !== "magic_link" ? (
          <div>
            <label htmlFor="auth-password" className={labelClassName}>
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "sign_up" ? "new-password" : "current-password"
              }
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={formFieldClassName}
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${primaryButtonClassName} w-full sm:w-auto`}
        >
          {isSubmitting
            ? "Working…"
            : mode === "sign_up"
              ? "Create account"
              : mode === "magic_link"
                ? "Send magic link"
                : "Sign in"}
        </button>
      </form>
    </SetupCard>
  );
}
