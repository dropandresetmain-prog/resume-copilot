"use client";

import { useState } from "react";

import type { CoverLetterRationale } from "@/types/cover-letter-draft";

type SecondaryCommunicationsPanelProps = {
  rationale?: CoverLetterRationale;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CopyBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — fail quietly.
    }
  }

  return (
    <div className="rounded-lg border border-folio-sage-border bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-folio-on-surface">{label}</p>
        <button
          type="button"
          className="text-xs font-medium text-folio-primary-container hover:underline focus:outline-none"
          onClick={() => void handleCopy()}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-folio-on-surface-variant">
        {content}
      </pre>
    </div>
  );
}

/**
 * "Other formats" — shorter outreach versions precomputed on the cover-letter rationale
 * (email / LinkedIn / recruiter DM / WhatsApp). No generation; copy-paste only.
 * Hidden entirely when the rationale carries no secondary formats.
 */
export function SecondaryCommunicationsPanel({ rationale }: SecondaryCommunicationsPanelProps) {
  const [open, setOpen] = useState(false);

  if (!rationale) {
    return null;
  }

  const blocks = [
    { label: "Email cover letter", content: rationale.emailCoverLetter },
    { label: "LinkedIn message", content: rationale.linkedinMessage },
    { label: "Recruiter DM", content: rationale.recruiterDm },
    { label: "WhatsApp intro", content: rationale.whatsappIntro },
  ].filter((block) => block.content?.trim());

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="mt-5" data-testid="cl-other-formats">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-folio-sage-border bg-white px-4 py-2.5 text-sm font-medium text-folio-on-surface hover:bg-folio-surface-container-low"
        aria-expanded={open}
        data-testid="cl-other-formats-toggle"
      >
        <span>Other formats ({blocks.length})</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4">
          <p className="text-[12px] text-folio-outline">
            Shorter outreach versions — copy and paste. The formal letter above is the downloadable
            artifact.
          </p>
          <div className="mt-3 space-y-3">
            {blocks.map((block) => (
              <CopyBlock key={block.label} label={block.label} content={block.content} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
