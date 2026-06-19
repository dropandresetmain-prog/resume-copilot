# Known Issues

## Export strategy (v0.6.7)

- **PDF Preview** uses the same print HTML/CSS as export, rendered in your **local browser** with **local installed fonts**.
- **Downloaded PDF** is rendered on the server (Vercel/Linux Chromium) with **different system fonts** — slight line-break differences may remain until a bundled web font is used.
- PDF Preview **detects overflow** when content exceeds one A4 page (`scrollHeight` on `.resume-pdf-a4-page`) and shows a warning; it does not guarantee server PDF page count until v0.7.0 validation.
- **Post-approval layout edits** set draft status to `layout_changed`; export is blocked until **Re-approve for Export**.
- **DOCX is secondary/editable** — may reflow or exceed one page in Word; UI warns near DOCX download. PDF is the final layout.
- PDF download on **desktop** opens in a new tab; **mobile** navigates in the same tab (browser may open inline instead of saving).
- DOCX download on **desktop** uses anchor download; **mobile** uses same-tab navigation with user hint.
- Export APIs resolve `fontFamily` / `headerAlignment` from reference resume via shared `buildExportResumeDocumentModel`.

## Font parity (deferred)

- No bundled web fonts in repo — Gill Sans MT / Calibri / Aptos resolve only when installed on each machine.
- Preview (user OS) vs export (Linux Chromium) can disagree by a few wrapped lines at the one-page boundary.
- Puppeteer awaits `document.fonts.ready` before print (hardening only; does not fix OS font mismatch).
- Future: embed an open-licensed metric-compatible web font, or v0.7.0 page-count gate.

## One-page (deferred hard enforcement)

- One-page is a **product target**; **hard export blocking** is deferred until Puppeteer page-count validation exists (v0.7.0 — see `ROADMAP.md`).
- `estimatePageFit()` remains heuristic — may disagree with PDF Preview / downloaded PDF.
- Overflow still exports with a warning; content is not auto-shrunk at export time.

## Layout controls

- Body font slider max is **20px** (~15pt visual). Optimizer still targets compact one-page defaults (~11px).

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
- When content exceeds one page, preview expands vertically — scroll the page to see overflow; dashed line marks page 1 boundary.

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
