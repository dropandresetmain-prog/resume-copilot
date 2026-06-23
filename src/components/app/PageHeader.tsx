type PageHeaderProps = {
  title: string;
  description: string;
  milestone?: string;
  eyebrow?: string;
  /** Tighter header for composer/workspace pages on small viewports. */
  compact?: boolean;
};

export function PageHeader({
  title,
  description,
  milestone,
  eyebrow,
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={compact ? "border-b border-slate-200/80 pb-4" : "border-b border-slate-200/80 pb-6"}>
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
      <h1
        className={
          compact
            ? "mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
            : "mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
        }
      >
        {title}
      </h1>
      <p
        className={
          compact
            ? "mt-1.5 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7"
            : "mt-2 max-w-3xl text-base leading-7 text-slate-600"
        }
      >
        {description}
      </p>
    </header>
  );
}
