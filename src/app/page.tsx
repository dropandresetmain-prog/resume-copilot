import { LandingCta } from "@/components/landing/LandingCta";

export default function Home() {
  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col justify-center px-4 py-16 lg:px-8">
        <header className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Career Resume Copilot
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Tailored resumes from your career inventory
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Upload your resume once, build a reusable career inventory, and generate
            tailored resumes from job descriptions. Sign in to sync your data through
            Supabase.
          </p>
        </header>
        <LandingCta />
      </div>
    </div>
  );
}
