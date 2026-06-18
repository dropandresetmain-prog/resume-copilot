import {
  CollapsibleSection,
  EmptyState,
  RawDetails,
} from "@/components/setup/ui";
import type { ParsedUnparsedSection } from "@/types/resume";

type UnparsedSectionCardProps = {
  section: ParsedUnparsedSection;
};

export function UnparsedSectionCard({ section }: UnparsedSectionCardProps) {
  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">{section.title}</h4>
          {section.originalHeader !== section.title && (
            <p className="mt-1 text-xs text-zinc-500">
              Header: {section.originalHeader}
            </p>
          )}
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
          Needs review
        </span>
      </div>

      {section.parseWarnings.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
          {section.parseWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {section.lines.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-800">
          {section.lines.map((line) => (
            <li key={`${section.id}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No lines preserved.</p>
      )}

      <div className="mt-3">
        <RawDetails label="View raw unparsed text" value={section.rawText} />
      </div>
    </article>
  );
}

type UnparsedSectionsPanelProps = {
  sections: ParsedUnparsedSection[];
};

export function UnparsedSectionsPanel({ sections }: UnparsedSectionsPanelProps) {
  if (sections.length === 0) {
    return (
      <EmptyState
        title="No unparsed sections"
        description="All detected sections were mapped to known parsers."
      />
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <UnparsedSectionCard key={section.id} section={section} />
      ))}
    </div>
  );
}

export function UnparsedSectionsCollapsible({
  sections,
}: UnparsedSectionsPanelProps) {
  return (
    <CollapsibleSection
      title={`Unparsed / Needs Review (${sections.length})`}
      defaultOpen={sections.length > 0}
    >
      <UnparsedSectionsPanel sections={sections} />
    </CollapsibleSection>
  );
}
