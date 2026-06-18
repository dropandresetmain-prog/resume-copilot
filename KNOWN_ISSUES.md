# Known Issues

## DOCX export (v0.6.1)

- DOCX uses Gill Sans MT (explicit on all runs); Word may substitute if font not installed.
- Preview 11px maps to DOCX 10pt body — not pixel-identical to browser preview.
- Borderless tables align left/right rows; minor Word vs browser differences may remain.
- Professional Summary is excluded from resume preview/export (cover letter future).
- **PDF strategy:** Validate DOCX fidelity manually first. If acceptable, PDF may be generated from DOCX or parallel canonical model; if DOCX remains unstable, consider direct HTML/PDF from layout model. PDF not implemented yet.

## DOCX export (v0.6.0 baseline)

- DOCX uses the shared `ResumeDocumentModel` but Word rendering may differ slightly from browser preview (tab alignment, exact line breaks, font metrics).
- Font family is first fallback from reference profile (usually Calibri) — DOCX font detection from uploaded resumes not implemented.
- Export API uses client access token in `Authorization` header — no service role; storage upload requires Supabase RLS policies on `generated-documents` and `stored_files`.
- If storage upload fails, API returns the DOCX file directly without persisting to bucket.
- Rich exported-file ↔ draft linkage in DB is deferred; each export inserts a new `stored_files` row.
- PDF export not built yet (v0.6.1).

## Layout preview (v0.5.x)

- Auto-optimization is heuristic — not true print pagination.
- If content still overflows after optimization, user must shorten bullets in Edit Resume Details (content is not auto-deleted).

## Generated drafts

- Delete is permanent (no soft-delete/archive yet).
- Duplicate Company — Role labels append date/time in UI only.
- Draft edits (review/approve) persist to `generated_resume_drafts` only — verified by `npm run test:draft-inventory-safety`.

## Fit score (preview)

- **Resume–Job Fit** in preview uses `preview-fit-heuristic-v1` — a provisional penalty/bonus model on draft content.
- Target specification: `docs/FIT_SCORE_RUBRIC.md` (`fit-rubric-v1`) — hygiene gates, jdScore 0–90, profileFit 0–10, verdict bands.
- Full rubric **not implemented yet** — do not treat preview score as final qualification fit.
- **Layout Fit (One Page)** is separate (`estimatePageFit`) and unrelated to job match.
