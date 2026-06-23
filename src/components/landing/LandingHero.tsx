import { LandingCta } from "@/components/landing/LandingCta";

const HERO_TAGS = [
  "Tailored resumes",
  "Cover letters",
  "Job-specific evidence",
  "One application package",
];

export function LandingHero() {
  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(34,211,238,0.22),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center px-4 py-16 sm:py-20 lg:px-8">
        <div className="flex w-full max-w-4xl flex-col items-center text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300/90">
            Career Resume Copilot
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Customize your resume for every role
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Upload once, build a reusable career inventory, and generate tailored resumes and
            cover letters from any job description — ready to review and export.
          </p>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {HERO_TAGS.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-slate-100 backdrop-blur-sm"
              >
                {tag}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex w-full flex-col items-center justify-center">
            <LandingCta variant="hero" />
            <p className="mt-4 text-sm text-slate-400">
              Sign in to sync your inventory · No credit card required
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="mt-14 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur-md sm:p-6"
        >
          <div className="rounded-xl border border-slate-200/20 bg-gradient-to-br from-slate-900 to-slate-800 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-300/80">
                  Application package preview
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Product Manager @ Acme Corp</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-200">
                Ready to export
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-2 w-3/4 rounded-full bg-white/20" />
              <div className="h-2 w-full rounded-full bg-white/12" />
              <div className="h-2 w-5/6 rounded-full bg-white/12" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-semibold text-slate-300">Tailored resume</p>
                  <p className="mt-2 text-xs text-slate-400">Evidence-ranked bullets from your inventory</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-semibold text-slate-300">Cover letter</p>
                  <p className="mt-2 text-xs text-slate-400">Role-specific narrative and company context</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
