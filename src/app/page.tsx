import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Career Resume Copilot
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-zinc-900">
        Build a structured resume inventory
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600">
        Upload multiple DOCX resumes, extract all major sections, and manage
        each file independently during testing.
      </p>
      <div className="mt-8">
        <Link
          href="/setup"
          className="inline-flex rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Go to setup
        </Link>
      </div>
    </div>
  );
}
