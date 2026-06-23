type PageHeaderProps = {
  title: string;
  description: string;
  milestone?: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, milestone, eyebrow }: PageHeaderProps) {
  return (
    <header className="rounded-lg border border-slate-900/10 bg-gradient-to-br from-white via-white to-cyan-50/60 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow ? (
          <p className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium uppercase text-cyan-800">
            {eyebrow}
          </p>
        ) : null}
        {milestone ? (
          <p className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium uppercase text-slate-500">
            {milestone}
          </p>
        ) : null}
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
    </header>
  );
}
