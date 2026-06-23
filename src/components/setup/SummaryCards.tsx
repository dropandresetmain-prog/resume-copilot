import type { InventoryCounts } from "@/lib/inventory/inventory";

import { SetupCard } from "@/components/setup/ui";

type SummaryCardsProps = {
  totals: InventoryCounts;
};

const STAT_ITEMS: {
  key: keyof InventoryCounts;
  label: string;
  shortLabel: string;
}[] = [
  { key: "resumes", label: "Resumes", shortLabel: "Resumes" },
  { key: "workExperiences", label: "Work experiences", shortLabel: "Roles" },
  { key: "workBullets", label: "Work bullets", shortLabel: "Bullets" },
  { key: "educationItems", label: "Education items", shortLabel: "Education" },
  { key: "skillCategories", label: "Skill categories", shortLabel: "Skills" },
];

export function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <SetupCard
      title="Inventory summary"
      description="Totals across all uploaded resumes in this browser."
      variant="muted"
    >
      <div className="mt-4 flex flex-col gap-2">
        {STAT_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <p className="min-w-0 text-sm font-medium text-slate-600">
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </p>
            <p className="shrink-0 text-xl font-semibold tabular-nums text-slate-950">
              {totals[item.key]}
            </p>
          </div>
        ))}
      </div>
    </SetupCard>
  );
}
