import type { ParsedBullet, ParsedExperience } from "@/types/resume";

import { RawDetails } from "@/components/setup/ui";

function BulletItem({ bullet }: { bullet: ParsedBullet }) {
  return (
    <li className="border-b border-zinc-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
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
      <RawDetails label="View raw bullet text" value={bullet.rawBulletText} />
    </li>
  );
}

export function ExperienceCard({ experience }: { experience: ParsedExperience }) {
  const metadata = [experience.role, experience.dateRange, experience.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-zinc-900">
            {experience.company}
          </h4>
          {metadata && (
            <p className="mt-1 text-sm text-zinc-600">{metadata}</p>
          )}
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

      {experience.experienceDuration?.parseWarning && (
        <p className="mt-2 text-sm text-amber-700">
          {experience.experienceDuration.parseWarning}
        </p>
      )}

      {experience.bullets.length > 0 ? (
        <ul className="mt-4">
          {experience.bullets.map((bullet) => (
            <BulletItem key={bullet.id} bullet={bullet} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No bullets extracted.</p>
      )}

      <div className="mt-3 space-y-1">
        <RawDetails label="View raw header" value={experience.rawHeader} />
        <RawDetails label="View raw role line" value={experience.rawRoleLine} />
      </div>
    </article>
  );
}
