import type { InventoryCounts } from "@/lib/inventory/inventory";

import { SetupCard } from "@/components/setup/ui";

type SummaryCardsProps = {
  totals: InventoryCounts;
};

const STAT_ITEMS: {
  key: keyof InventoryCounts;
  label: string;
}[] = [
  { key: "resumes", label: "Resumes" },
  { key: "workExperiences", label: "Work Experiences" },
  { key: "workBullets", label: "Work Bullets" },
  { key: "educationItems", label: "Education Items" },
  { key: "skillCategories", label: "Skill Categories" },
];

export function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <SetupCard
      title="Inventory summary"
      description="Totals across all uploaded resumes in this browser."
    >
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STAT_ITEMS.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
          >
            <p className="text-2xl font-semibold tabular-nums text-zinc-900">
              {totals[item.key]}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-500">{item.label}</p>
          </div>
        ))}
      </div>
    </SetupCard>
  );
}
