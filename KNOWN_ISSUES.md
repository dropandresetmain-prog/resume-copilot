# Known Issues

## Export strategy (v0.6.5)

- **PDF Preview is the authoritative preview** — `renderResumePdfHtml()` iframe on the preview page. Downloaded PDF should match PDF Preview when layout settings are the same.
- **Browser layout preview** (React) is demoted to “Advanced — approximate layout estimate” only; it uses separate `RESUME_LAYOUT_SPACING` and must not be used for export decisions.
- **DOCX is secondary/editable** — Word may reflow, exceed one page, or differ from PDF. Do not expect PDF parity.
- PDF download on **desktop** opens in a new tab; **mobile** navigates in the same tab (browser may open inline instead of saving).
- DOCX download on **desktop** uses anchor download; **mobile** uses same-tab navigation with user hint.
- Export APIs resolve `fontFamily` / `headerAlignment` from reference resume via shared `buildExportResumeDocumentModel`.

## One-page (deferred hard enforcement)

- One-page is a **product target**; **hard export blocking** is deferred until Puppeteer page-count validation exists (Phase 2 — see `ROADMAP.md`).
- `estimatePageFit()` remains heuristic — may disagree with PDF Preview / downloaded PDF.
- Overflow still exports with a warning; content is not auto-shrunk at export time.

## PDF export

- Print CSS uses `RESUME_PRINT_LAYOUT_SPACING` (compact, Puppeteer-controlled).
- Gill Sans MT renders only if installed on the PDF generation machine.
- Full-page scaling is not used; layout is controlled via font size, line-height, and compact margins.
- PDF is generated from `ResumeDocumentModel` HTML via `puppeteer-core` + `@sparticuz/chromium`.
- Vercel: Chromium bundle adds deploy size; route uses `maxDuration: 60` and `runtime: nodejs`.
- Local dev: requires Google Chrome or `LOCAL_CHROME_PATH` / `CHROME_EXECUTABLE_PATH`.
- If Supabase storage upload fails, API returns raw PDF bytes.

## DOCX export

- DOCX uses Gill Sans MT (explicit on all runs); Word may substitute if font not installed.
- Preview 11px maps to DOCX 10pt body — not pixel-identical to PDF.
- Borderless tables align left/right rows; minor Word vs PDF differences may remain.
- Professional Summary excluded from resume preview/export.

## Mobile preview

- PDF Preview scales A4 proportionally on narrow screens; inner HTML stays fixed mm (no reflow).
- Very long resumes may extend below the visible frame — scroll the page; iframe shows first page height at scale.

## Layout preview (v0.5.x)

- Auto-optimization is heuristic — not true print pagination.
- If content still overflows after optimization, shorten bullets in Edit Resume Details.

## Generated drafts

- Delete is permanent (no soft-delete/archive yet).
- Draft edits persist to `generated_resume_drafts` only — never inventory.

## Fit score (preview)

- **Resume–Job Fit** uses `preview-fit-heuristic-v1` — provisional.
- Target: `docs/FIT_SCORE_RUBRIC.md` (`fit-rubric-v1`) — not implemented.
- **Layout Fit (One Page)** is separate (`estimatePageFit`).
