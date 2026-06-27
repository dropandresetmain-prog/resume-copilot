import Link from "next/link";

export default function ConfirmEmailPage() {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-[12px] border border-folio-outline-variant/50 px-8 py-10 text-center">
      <p className="text-[22px] font-bold text-folio-primary mb-2">Folio</p>

      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-folio-primary-container/15 flex items-center justify-center text-folio-primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <polyline points="2,4 12,13 22,4" />
          </svg>
        </div>
      </div>

      <h1 className="text-[20px] font-medium text-folio-on-surface mb-3">
        Check your email
      </h1>
      <p className="text-[14px] text-folio-on-surface-variant mb-8">
        We sent you a confirmation link. Click it to activate your account and
        continue to onboarding.
      </p>

      <p className="text-[12px] text-folio-outline">
        Already confirmed?{" "}
        <Link href="/auth/login" className="text-folio-primary-container hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
