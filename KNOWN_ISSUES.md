# Known Issues

## Layout preview (v0.5.4)

- Auto-optimization is heuristic — not true print pagination.
- If content still overflows after optimization, user must shorten bullets in Edit Resume Details (content is not auto-deleted).
- Font family defaults to Calibri/Arial stack — DOCX font detection not implemented yet.
- **Approve for Export** saves `status: approved` — DOCX/PDF export not built yet (v0.6.x).

## Generated drafts

- Delete is permanent (no soft-delete/archive yet).
- Duplicate Company — Role labels append date/time in UI only.
- Draft edits (review/approve) persist to `generated_resume_drafts` only — verified by `npm run test:draft-inventory-safety`.

## Fit score (preview)

- **Resume–Job Fit** in preview uses `preview-fit-heuristic-v1` — a provisional penalty/bonus model on draft content.
- Target specification: `docs/FIT_SCORE_RUBRIC.md` (`fit-rubric-v1`) — hygiene gates, jdScore 0–90, profileFit 0–10, verdict bands.
- Full rubric **not implemented yet** — do not treat preview score as final qualification fit.
- **Layout Fit (One Page)** is separate (`estimatePageFit`) and unrelated to job match.
