"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpWithPassword, signInWithGoogle } from "@/lib/supabase/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setLoading(true);
    try {
      const result = await signUpWithPassword(email, password);
      // When email confirmation is required, Supabase returns no session.
      // Route the user to a holding page rather than a protected route they
      // cannot access yet.
      if (!result.session) {
        router.push("/auth/confirm-email");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Sign up failed." });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Google sign-in failed." });
    }
  }

  return (
    <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10">
      {/* Wordmark */}
      <p className="text-center text-[22px] font-bold text-folio-primary mb-2">Folio</p>
      <h1 className="text-center text-[20px] font-medium text-folio-on-surface mb-8">
        Create your account
      </h1>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 h-11 rounded-[8px] border border-folio-outline-variant bg-white text-[14px] font-medium text-folio-on-surface hover:bg-folio-surface-container-low transition-colors mb-5"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-folio-outline-variant" />
        <span className="text-[12px] text-folio-outline">or continue with email</span>
        <div className="flex-1 h-px bg-folio-outline-variant" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errors.form && (
          <p className="text-[12px] text-folio-error">{errors.form}</p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-folio-on-surface-variant" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
          />
          {errors.email && <p className="text-[12px] text-folio-error">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-folio-on-surface-variant" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
          />
          {errors.password && <p className="text-[12px] text-folio-error">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-[8px] bg-folio-cta-secondary text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-1"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-[12px] text-folio-outline mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-folio-primary-container hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  // Google brand colours
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
