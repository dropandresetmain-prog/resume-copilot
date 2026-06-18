import { countResume } from "@/lib/inventory/inventory";
import type { ParsedResume } from "@/types/resume";

import { EmptyState, SetupCard } from "@/components/setup/ui";

type ResumeListProps = {
  resumes: ParsedResume[];
  onDeleteResume: (resumeId: string) => void;
};

export function ResumeList({ resumes, onDeleteResume }: ResumeListProps) {
  function handleDelete(resume: ParsedResume) {
    const confirmed = window.confirm(
      `Delete "${resume.filename}" and its parsed inventory?`,
    );
    if (!confirmed) return;
    onDeleteResume(resume.id);
  }

  return (
    <SetupCard
      title="Uploaded resumes"
      description="Manage parsed resumes separately from the detailed inventory below."
    >
      {resumes.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No resumes uploaded"
            description="Upload one or more DOCX files to start building your inventory."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {resumes.map((resume) => {
            const counts = countResume(resume);
            return (
              <li
                key={resume.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {resume.filename}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Uploaded {new Date(resume.uploadedAt).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    {counts.workExperiences} experiences · {counts.workBullets}{" "}
                    bullets · {counts.educationItems} education ·{" "}
                    {counts.skillCategories} skill categories
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(resume)}
                  aria-label={`Delete ${resume.filename}`}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SetupCard>
  );
}
