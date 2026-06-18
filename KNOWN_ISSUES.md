# Known Issues

## Layout preview (v0.5.3)

- `/resume-preview/[draftId]` is the primary post-generation view; `/resume-preview/[draftId]/edit` is the persistent edit workspace.
- A4 preview uses CSS mm sizing and a line-count estimator — not true print pagination.
- One-page boundary is a dashed marker at 297mm; overflow content is visible below for manual tuning.
- Font family defaults to Calibri/Arial stack — DOCX font detection not implemented yet.
- Reverse-chronological sort applies at layout/render layer only; source inventory order is unchanged.
- **Approve for Export** saves `status: approved` — DOCX/PDF export not built yet (v0.6.x).

## Duration

- Inclusive month counting applies to parsed month-year ranges; year-only ranges approximate to January of that year.
