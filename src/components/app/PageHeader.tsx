type PageHeaderProps = {
  title: string;
  description: string;
  milestone?: string;
};

export function PageHeader({ title, description, milestone }: PageHeaderProps) {
  return (
    <header className="space-y-2">
      {milestone ? (
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {milestone}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="max-w-3xl text-base text-slate-600">{description}</p>
    </header>
  );
}
