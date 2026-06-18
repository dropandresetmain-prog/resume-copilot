import Link from "next/link";

import { primaryButtonClassName } from "@/components/setup/ui";

export default function Home() {
  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col justify-center px-4 py-16 lg:px-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Career Resume Copilot
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Build a structured resume inventory
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Upload DOCX resumes, build a collated inventory, save job descriptions,
            and review AI-assisted enrichment. Data syncs through Supabase when you
            are signed in.
          </p>
        </header>
        <div className="mt-8">
          <Link href="/setup" className={`inline-flex ${primaryButtonClassName}`}>
            Go to setup
          </Link>
        </div>
      </div>
    </div>
  );
}
