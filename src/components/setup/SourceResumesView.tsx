import { ParsedInventorySection } from "@/components/setup/ParsedInventorySection";
import { SetupCard } from "@/components/setup/ui";
import type { ParsedResume } from "@/types/resume";

type SourceResumesViewProps = {
  resumes: ParsedResume[];
};

export function SourceResumesView({ resumes }: SourceResumesViewProps) {
  return (
    <SetupCard
      title="Source resumes / debug"
      description="Per-resume parsed output for parser inspection. Raw fields remain expandable here."
    >
      <div className="mt-4">
        <ParsedInventorySection resumes={resumes} embedded />
      </div>
    </SetupCard>
  );
}
