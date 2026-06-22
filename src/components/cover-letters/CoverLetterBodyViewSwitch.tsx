"use client";

export type CoverLetterBodyView = "pdf" | "raw";

type CoverLetterBodyViewSwitchProps = {
  view: CoverLetterBodyView;
  onChange: (view: CoverLetterBodyView) => void;
  disabled?: boolean;
};

export const COVER_LETTER_VIEW_TOGGLE_TEST_ID = "cover-letter-view-toggle";

export function CoverLetterBodyViewSwitch({
  view,
  onChange,
  disabled = false,
}: CoverLetterBodyViewSwitchProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
      data-testid={COVER_LETTER_VIEW_TOGGLE_TEST_ID}
      role="tablist"
      aria-label="Cover letter view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "pdf"}
        data-view="pdf"
        disabled={disabled}
        onClick={() => onChange("pdf")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          view === "pdf"
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        PDF Preview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "raw"}
        data-view="raw"
        disabled={disabled}
        onClick={() => onChange("raw")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          view === "raw"
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        Raw Text
      </button>
    </div>
  );
}
