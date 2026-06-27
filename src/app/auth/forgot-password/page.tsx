"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/supabase/auth";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordFallback() {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10">
      <p className="text-center text-[22px] font-bold text-folio-primary mb-2">Folio</p>
      <p className="text-center text-sm text-folio-outline">Loading…</p>
    </div>
  );
}

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccessMessage("Check your email for a password reset link.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10">
      <p className="text-center text-[22px] font-bold text-folio-primary mb-2">Folio</p>
      <h1 className="text-center text-[20px] font-medium text-folio-on-surface mb-2">
        Reset your password
      </h1>
      <p className="text-center text-[13px] text-folio-outline mb-8">
        Enter your account email and we&apos;ll send a link to choose a new password.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && <p className="text-[12px] text-folio-error">{error}</p>}
        {successMessage && (
          <p className="rounded-[8px] border border-folio-sage-border bg-folio-mint-surface px-3 py-2 text-[12px] text-folio-on-surface-variant">
            {successMessage}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-folio-on-surface-variant" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-[8px] bg-folio-cta-secondary text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-1"
        >
          {loading ? "Sending link…" : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-[12px] text-folio-outline mt-6">
        <Link href="/auth/login" className="text-folio-primary-container hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
