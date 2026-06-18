import type {
  CollatedExperience,
  CollatedInventory,
  CollatedSkillCategory,
} from "@/types/collated";

import {
  CollapsibleSection,
  EmptyState,
  SetupCard,
  SourceCitationChips,
} from "@/components/setup/ui";
import { EducationCard } from "@/components/setup/EducationCard";

type CollatedInventoryViewProps = {
  collated: CollatedInventory;
};

function ExperienceCollatedCard({ experience }: { experience: CollatedExperience }) {
  const metadata = [
    experience.role,
    experience.dateRange,
    experience.location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            {experience.company}
          </h3>
          {metadata && <p className="mt-1 text-sm text-zinc-600">{metadata}</p>}
          {experience.descriptor && (
            <p className="mt-1 text-sm text-zinc-500">{experience.descriptor}</p>
          )}
        </div>
        {experience.experienceDuration?.display && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
            {experience.experienceDuration.display}
          </span>
        )}
      </div>

      <SourceCitationChips citations={experience.sourceCitations} />

      {experience.bullets.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {experience.bullets.map((bullet) => (
            <li key={bullet.id} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-start gap-2">
                {bullet.keyword ? (
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {bullet.keyword}
                  </span>
                ) : null}
                <p className="min-w-0 flex-1 text-sm leading-6 text-zinc-800">
                  {bullet.description}
                </p>
              </div>
              <SourceCitationChips citations={bullet.sourceCitations} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">No bullets in this experience.</p>
      )}
    </article>
  );
}

function groupSkillsByCategory(collated: CollatedInventory) {
  const order: CollatedSkillCategory[] = [
    "Languages",
    "Technical Skills",
    "Interests",
    "Other",
  ];

  return order.filter((category) =>
    collated.skillItems.some((item) => item.category === category),
  );
}

export function CollatedInventoryView({ collated }: CollatedInventoryViewProps) {
  const skillCategories = groupSkillsByCategory(collated);
  const hasContent =
    collated.experiences.length > 0 ||
    collated.educationItems.length > 0 ||
    collated.additionalExperienceItems.length > 0 ||
    collated.skillItems.length > 0;

  if (!hasContent) {
    return (
      <SetupCard
        title="Collated inventory"
        description="Merged, reusable items across all uploaded resumes."
      >
        <div className="mt-4">
          <EmptyState
            title="No collated inventory yet"
            description="Upload resumes to build a merged inventory with source citations."
          />
        </div>
      </SetupCard>
    );
  }

  return (
    <SetupCard
      title="Collated inventory"
      description="Merged across all uploaded resumes. Repeated items show multiple source files."
    >
      <div className="mt-4 space-y-4">
        <CollapsibleSection
          title={`Work Experience (${collated.experiences.length})`}
          defaultOpen
        >
          {collated.experiences.length === 0 ? (
            <EmptyState
              title="No work experience"
              description="No structured work experiences were found across uploaded resumes."
            />
          ) : (
            <div className="space-y-4">
              {collated.experiences.map((experience) => (
                <ExperienceCollatedCard
                  key={experience.id}
                  experience={experience}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={`Education (${collated.educationItems.length})`}>
          {collated.educationItems.length === 0 ? (
            <EmptyState
              title="No education items"
              description="Structured education entries will appear here with institution, programmes, dates, and bullets."
            />
          ) : (
            <div className="space-y-4">
              {collated.educationItems.map((item) => (
                <EducationCard
                  key={item.id}
                  item={{
                    institution: item.institution,
                    location: item.location,
                    programmes: item.programmes,
                    dateRange: item.dateRange,
                    experienceDuration: item.experienceDuration,
                    bullets: item.bullets,
                    rawTexts: item.rawTexts,
                    parseWarnings: item.parseWarnings,
                    sourceCitations: item.sourceCitations,
                  }}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Additional Experience (${collated.additionalExperienceItems.length})`}
        >
          {collated.additionalExperienceItems.length === 0 ? (
            <EmptyState
              title="No additional experience"
              description="Additional roles and activities will appear as atomic items."
            />
          ) : (
            <ul className="space-y-3">
              {collated.additionalExperienceItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                >
                  {item.category && (
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {item.category}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-zinc-800">{item.text}</p>
                  <SourceCitationChips citations={item.sourceCitations} />
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={`Skills & Interest (${collated.skillItems.length})`}>
          {collated.skillItems.length === 0 ? (
            <EmptyState
              title="No skills found"
              description="Languages, technical skills, and interests will appear as individual items."
            />
          ) : (
            <div className="space-y-4">
              {[...skillCategories].map((category) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-zinc-800">{category}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {collated.skillItems
                      .filter((item) => item.category === category)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                        >
                          <p className="text-sm text-zinc-800">{item.text}</p>
                          <SourceCitationChips citations={item.sourceCitations} />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </SetupCard>
  );
}
