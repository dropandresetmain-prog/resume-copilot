"use client";

import type { CoverLetterRationale } from "@/types/cover-letter-draft";

import { SetupCard } from "@/components/setup/ui";

type SecondaryCommunicationsPanelProps = {
  rationale?: CoverLetterRationale;
};

function CopyBlock({ label, content }: { label: string; content: string }) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <button
          type="button"
          className="text-xs font-medium text-blue-700 underline"
          onClick={() => void navigator.clipboard.writeText(content)}
        >
          Copy
        </button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{content}</pre>
    </div>
  );
}

export function SecondaryCommunicationsPanel({ rationale }: SecondaryCommunicationsPanelProps) {
  if (!rationale) {
    return null;
  }

  const blocks = [
    { label: "Email cover letter", content: rationale.emailCoverLetter },
    { label: "LinkedIn message", content: rationale.linkedinMessage },
    { label: "Recruiter DM", content: rationale.recruiterDm },
    { label: "WhatsApp intro", content: rationale.whatsappIntro },
  ].filter((block) => block.content.trim());

  if (blocks.length === 0) {
    return null;
  }

  return (
    <SetupCard
      title="Other formats"
      description="Shorter outreach versions — copy and paste. Formal letter above is the downloadable artifact."
    >
      <div className="mt-4 space-y-3">
        {blocks.map((block) => (
          <CopyBlock key={block.label} label={block.label} content={block.content} />
        ))}
      </div>
    </SetupCard>
  );
}
