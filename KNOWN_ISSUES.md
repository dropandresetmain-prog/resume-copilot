# Known Issues

## Layout preview (v0.5.2)

- `/resume-preview/[draftId]` is the primary post-generation view; `/resume-preview/[draftId]/edit` is the persistent edit workspace.
- A4 preview uses CSS aspect ratio and line-count estimation — not true print pagination.
- One-page overflow warning is heuristic; user must reduce bullets manually via Edit Resume Details (content is not auto-deleted).
- **Approve for Export** saves `status: approved` — DOCX/PDF export not built yet (v0.6.x).

## Duration

- Inclusive month counting applies to parsed month-year ranges; year-only ranges still approximate to January of that year.
