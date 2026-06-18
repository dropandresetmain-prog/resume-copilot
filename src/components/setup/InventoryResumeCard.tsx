import { countResume } from "@/lib/inventory/inventory";
import type { ParsedResume } from "@/types/resume";

import { ExperienceCard } from "@/components/setup/ExperienceCard";
import { EducationCard } from "@/components/setup/EducationCard";
import { UnparsedSectionsCollapsible } from "@/components/setup/UnparsedSectionCard";
import {
  CollapsibleSection,
  EmptyState,
  RawDetails,
} from "@/components/setup/ui";

type InventoryResumeCardProps = {
  resume: ParsedResume;
};

export function InventoryResumeCard({ resume }: InventoryResumeCardProps) {
  const counts = countResume(resume);

  return (
    <details className="group rounded-xl border border-zinc-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-zinc-900">
              {resume.filename}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Uploaded {new Date(resume.uploadedAt).toLocaleString()}
            </p>
          </div>
          <span
            aria-hidden
            className="text-zinc-400 transition group-open:rotate-180"
          >
            ▾
          </span>
        </div>
      </summary>

      <div className="space-y-4 border-t border-zinc-100 px-5 py-5">
        <CollapsibleSection
          title={`Work Experience (${counts.workExperiences})`}
          defaultOpen
        >
          {resume.workExperiences.length === 0 ? (
            <EmptyState
              title="No work experience found"
              description="This resume did not produce structured work experience entries."
            />
          ) : (
            <div className="space-y-4">
              {resume.workExperiences.map((experience) => (
                <ExperienceCard key={experience.id} experience={experience} />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={`Education (${counts.educationItems})`}>
          {resume.education.length === 0 ? (
            <EmptyState
              title="No education found"
              description="Education section was empty or could not be structured."
            />
          ) : (
            <div className="space-y-4">
              {resume.education.map((item) => (
                <EducationCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Additional Experience">
          {resume.additionalExperience.lines.length === 0 ? (
            <EmptyState
              title="No additional experience"
              description="No additional experience lines were preserved for this resume."
            />
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
              {resume.additionalExperience.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <RawDetails
            label="View raw additional experience"
            value={resume.additionalExperience.rawText}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={`Skills & Interest (${counts.skillCategories} categories)`}
        >
          {counts.skillCategories === 0 &&
          resume.skills.rawText.trim().length === 0 ? (
            <EmptyState
              title="No skills found"
              description="Skills and interests were not detected in this resume."
            />
          ) : (
            <dl className="space-y-3 text-sm">
              {resume.skills.languages.length > 0 && (
                <div>
                  <dt className="font-medium text-zinc-800">Languages</dt>
                  <dd className="mt-1 text-zinc-600">
                    {resume.skills.languages.join(", ")}
                  </dd>
                </div>
              )}
              {resume.skills.technicalSkills.length > 0 && (
                <div>
                  <dt className="font-medium text-zinc-800">Technical Skills</dt>
                  <dd className="mt-1 text-zinc-600">
                    {resume.skills.technicalSkills.join(", ")}
                  </dd>
                </div>
              )}
              {resume.skills.interests.length > 0 && (
                <div>
                  <dt className="font-medium text-zinc-800">Interests</dt>
                  <dd className="mt-1 text-zinc-600">
                    {resume.skills.interests.join(", ")}
                  </dd>
                </div>
              )}
              {resume.skills.other.length > 0 && (
                <div>
                  <dt className="font-medium text-zinc-800">Other</dt>
                  <dd className="mt-1 text-zinc-600">
                    {resume.skills.other.join(" | ")}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <RawDetails label="View raw skills text" value={resume.skills.rawText} />
        </CollapsibleSection>

        <CollapsibleSection
          title={`Parse Warnings (${resume.parseWarnings.length})`}
          defaultOpen={resume.parseWarnings.length > 0}
        >
          {resume.parseWarnings.length === 0 ? (
            <p className="text-sm text-zinc-500">No parse warnings for this resume.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
              {resume.parseWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <UnparsedSectionsCollapsible sections={resume.unparsedSections} />
      </div>
    </details>
  );
}
