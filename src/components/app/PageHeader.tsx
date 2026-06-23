type PageHeaderProps = {
  title: string;
  description: string;
  milestone?: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, milestone, eyebrow }: PageHeaderProps) {
  return (
    <header className="border-b border-slate-200/80 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{eyebrow}</p>
        ) : null}
        {milestone ? (
          <p className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {milestone}
          </p>
        ) : null}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
    </header>
  );
}
