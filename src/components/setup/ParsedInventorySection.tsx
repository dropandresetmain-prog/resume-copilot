import type { ParsedResume } from "@/types/resume";

import { InventoryResumeCard } from "@/components/setup/InventoryResumeCard";
import { EmptyState, SetupCard } from "@/components/setup/ui";

type ParsedInventorySectionProps = {
  resumes: ParsedResume[];
  embedded?: boolean;
};

export function ParsedInventorySection({
  resumes,
  embedded = false,
}: ParsedInventorySectionProps) {
  const content =
    resumes.length === 0 ? (
      <EmptyState
        title="No parsed inventory yet"
        description="Uploaded resumes will appear here with work experience, education, skills, and warnings."
      />
    ) : (
      <div className="space-y-4">
        {resumes.map((resume) => (
          <InventoryResumeCard key={resume.id} resume={resume} />
        ))}
      </div>
    );

  if (embedded) {
    return content;
  }

  return (
    <SetupCard
      title="Parsed inventory"
      description="Inspect structured sections per resume. Raw parser output is tucked away behind expandable details."
    >
      <div className="mt-4">{content}</div>
    </SetupCard>
  );
}
