"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ── Inline SVG icons ──────────────────────────────────────────────────────── */

function VaultIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V7M12 17v-2M9 12H7M17 12h-2" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 8 6 12 14 4" />
    </svg>
  );
}

/* ── Navbar ────────────────────────────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white transition-shadow duration-200"
      style={{
        borderBottom: "1px solid #D8ECC8",
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="text-[18px] font-medium leading-none"
          style={{ color: "#085041" }}
        >
          Folio
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-md border px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              borderColor: "#085041",
              color: "#085041",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#B85C38" }}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="w-full py-24 md:py-32"
      style={{ backgroundColor: "#FAFDF7" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <h1
          className="text-[2.75rem] font-medium leading-[1.12] tracking-tight md:text-[3rem]"
          style={{ color: "#085041" }}
        >
          Your experience is already impressive. Your resume just needs to say so.
        </h1>
        <p
          className="mt-5 max-w-[560px] text-[18px] leading-relaxed"
          style={{ color: "#3f4944" }}
        >
          Folio builds tailored resumes and cover letters from your career vault, matched to every job you apply for.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#B85C38" }}
          >
            Get started free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-md border px-6 py-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: "#085041", color: "#085041" }}
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── How it works ──────────────────────────────────────────────────────────── */

const HOW_STEPS = [
  {
    icon: <VaultIcon />,
    heading: "Build your vault once",
    body: "Import your history, achievements, and skills into one secure searchable repository.",
  },
  {
    icon: <DocumentIcon />,
    heading: "Drop in a job",
    body: "Paste a job description. Our engine parses exactly what the hiring manager is looking for.",
  },
  {
    icon: <SparkleIcon />,
    heading: "Get a tailored resume",
    body: "Folio extracts the perfect evidence from your vault to match the job requirements.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full py-20 md:py-28"
      style={{ backgroundColor: "#F1EFE8" }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          className="mb-14 text-center text-2xl font-medium"
          style={{ color: "#085041" }}
        >
          How it works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {HOW_STEPS.map((step) => (
            <div key={step.heading} className="flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "#EAF3DE", color: "#085041" }}
              >
                {step.icon}
              </div>
              <h3 className="mb-2 text-base font-medium" style={{ color: "#085041" }}>
                {step.heading}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#3f4944" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Vault callout ─────────────────────────────────────────────────────────── */

function VaultCallout() {
  return (
    <section className="w-full py-20 md:py-28" style={{ backgroundColor: "#FAFDF7" }}>
      <div className="mx-auto grid max-w-6xl gap-16 px-6 md:grid-cols-2 md:items-center">
        {/* Text */}
        <div>
          <h2
            className="text-2xl font-medium leading-snug"
            style={{ color: "#085041" }}
          >
            Your career vault. The last time you&apos;ll ever rewrite your history.
          </h2>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "#3f4944" }}
          >
            Traditional resumes force you to cut great experiences to fit a page. Folio stores everything. When you apply for a job, it pulls the most relevant experiences to create a focused high-impact document.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Automatic metric extraction from old bullet points",
              "Skill-to-job semantic mapping",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "#3f4944" }}>
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#EAF3DE", color: "#085041" }}
                >
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Mockup card */}
        <div
          className="rounded-xl border bg-white p-6 shadow-sm"
          style={{ borderColor: "#D8ECC8" }}
        >
          <div
            className="mb-4 border-b pb-3"
            style={{ borderColor: "#D8ECC8" }}
          >
            <p className="text-xs font-medium" style={{ color: "#085041" }}>
              Career vault · 14 projects · 8 roles
            </p>
          </div>
          <div className="space-y-3">
            {[
              { role: "Senior Product Manager", company: "Acme Corp · 2021–2024" },
              { role: "Product Manager", company: "StartupCo · 2018–2021" },
            ].map((exp) => (
              <div
                key={exp.role}
                className="rounded-lg border p-3"
                style={{ borderColor: "#EAF3DE", backgroundColor: "#FAFDF7" }}
              >
                <p className="text-sm font-medium" style={{ color: "#085041" }}>
                  {exp.role}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#6f7973" }}>
                  {exp.company}
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="h-1.5 w-5/6 rounded-full" style={{ backgroundColor: "#EAF3DE" }} />
                  <div className="h-1.5 w-4/6 rounded-full" style={{ backgroundColor: "#EAF3DE" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Resume teaser ─────────────────────────────────────────────────────────── */

function ResumeTeaser() {
  return (
    <section className="w-full py-20 md:py-28" style={{ backgroundColor: "#085041" }}>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        {/* Blurred resume card */}
        <div className="relative w-full max-w-sm">
          <div
            className="rounded-xl border bg-white p-6 shadow-xl"
            style={{ borderColor: "#D8ECC8", filter: "blur(2px)", opacity: 0.6 }}
            aria-hidden
          >
            <div className="mb-4 space-y-2">
              <div className="h-3 w-2/3 rounded-full bg-gray-200" />
              <div className="h-2 w-1/2 rounded-full bg-gray-100" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-gray-200" />
              <div className="h-2 w-5/6 rounded-full bg-gray-100" />
              <div className="h-2 w-4/6 rounded-full bg-gray-200" />
              <div className="h-2 w-full rounded-full bg-gray-100" />
              <div className="h-2 w-3/4 rounded-full bg-gray-200" />
            </div>
          </div>
          {/* Fade gradient overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-xl"
            style={{ background: "linear-gradient(to bottom, transparent, #085041)" }}
            aria-hidden
          />
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-widest" style={{ color: "#D8ECC8" }}>
          Generated by Folio
        </p>

        <h2 className="mt-6 text-2xl font-medium text-white">
          Tailored to the job, not just the title.
        </h2>
        <p className="mt-4 max-w-[520px] text-sm leading-relaxed" style={{ color: "#D8ECC8" }}>
          Our AI understands the nuances of job descriptions. It doesn&apos;t just swap keywords — it reframes your actual experience to speak the recruiter&apos;s language.
        </p>
      </div>
    </section>
  );
}

/* ── Final CTA ─────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="w-full py-24 md:py-32" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 text-center">
        <h2 className="text-2xl font-medium" style={{ color: "#085041" }}>
          Ready to apply smarter?
        </h2>
        <Link
          href="/auth/signup"
          className="mt-8 rounded-md px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#B85C38" }}
        >
          Get started free
        </Link>
        <p className="mt-4 text-xs" style={{ color: "#6f7973" }}>
          No credit card needed. Set up in 2 minutes.
        </p>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      className="w-full border-t"
      style={{ backgroundColor: "#F1EFE8", borderColor: "#D8ECC8" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
        <p className="text-sm" style={{ color: "#6f7973" }}>
          <span className="font-medium" style={{ color: "#085041" }}>Folio</span>
          {" "}· © 2024 Folio Career. All rights reserved.
        </p>
        <nav className="flex gap-6">
          {["Privacy Policy", "Terms of Service", "Contact"].map((label) => (
            <a
              key={label}
              href="#"
              className="text-sm transition-colors hover:underline"
              style={{ color: "#6f7973" }}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export function LandingHero() {
  return (
    <div className="flex min-h-screen flex-col" style={{ scrollBehavior: "smooth" }}>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <VaultCallout />
        <ResumeTeaser />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
