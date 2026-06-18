import type { SourceCitation } from "@/types/collated";
import type { ExperienceDuration } from "@/types/resume";

import { RawDetails, SourceCitationChips } from "@/components/setup/ui";

export type EducationCardData = {
  institution: string;
  location?: string;
  programmes: string[];
  dateRange?: string;
  experienceDuration?: ExperienceDuration;
  bullets: string[];
  rawText?: string;
  rawTexts?: string[];
  parseWarnings?: string[];
  sourceCitations?: SourceCitation[];
};

type EducationCardProps = {
  item: EducationCardData;
};

export function EducationCard({ item }: EducationCardProps) {
  const rawDisplay =
    item.rawTexts && item.rawTexts.length > 0
      ? item.rawTexts.join("\n\n---\n\n")
      : item.rawText;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-zinc-900">
            {item.institution || "Education entry"}
          </h4>
          {item.location && (
            <p className="mt-1 text-sm text-zinc-600">{item.location}</p>
          )}
          {item.programmes.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {item.programmes.map((programme) => (
                <li key={programme}>{programme}</li>
              ))}
            </ul>
          )}
          {item.dateRange && (
            <p className="mt-2 text-sm text-zinc-600">{item.dateRange}</p>
          )}
        </div>
        {item.experienceDuration?.display && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
            {item.experienceDuration.display}
          </span>
        )}
      </div>

      {item.experienceDuration?.parseWarning && (
        <p className="mt-2 text-sm text-amber-700">
          {item.experienceDuration.parseWarning}
        </p>
      )}

      {item.sourceCitations && item.sourceCitations.length > 0 && (
        <SourceCitationChips citations={item.sourceCitations} />
      )}

      {item.bullets.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-800">
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No achievement bullets.</p>
      )}

      {rawDisplay && (
        <div className="mt-3">
          <RawDetails label="View raw education text" value={rawDisplay} />
        </div>
      )}

      {item.parseWarnings && item.parseWarnings.length > 0 && (
        <p className="mt-2 text-sm text-amber-700">
          {item.parseWarnings.join(" ")}
        </p>
      )}
    </article>
  );
}
