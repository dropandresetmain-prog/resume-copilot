# Known Issues

## Export strategy (v0.7.0)

- **Server PDF page count is export truth** — Puppeteer + `pdf-lib` validation on Approve and hard block on PDF export when `pageCount > 1`.
- **PDF Preview** is the closest **local** approximation (browser fonts, screen layout). It can disagree with server PDF at the one-page boundary.
- **Heuristic `estimatePageFit()`** is non-authoritative — shown separately from server validation.
- Approve runs server PDF generation (~3–15s cold on Vercel) — validating state shown in UI.
- **Post-approval layout edits** set `layout_changed` and clear `serverPdfValidation`; re-approve required.
- **DOCX** is secondary/editable — no one-page server gate; may reflow in Word.
- PDF/DOCX delivery uses blob download with intended filename (v0.6.8).
- Export APIs use shared `buildExportResumeDocumentModel()` + `resolveExportDocumentModelForDraft()`.

## One-page enforcement

- Export blocked at Approve and PDF download when server PDF exceeds one page (422).
- No auto-shrink, AI compression, or density scoring yet.
- Underfilled one-page PDFs (low page usage) are **not** flagged yet — deferred.

## Font parity

- Preview (user OS) vs export (Linux Chromium) can still disagree; server page count resolves export truth.
- No bundled web fonts in repo.
- Puppeteer awaits `document.fonts.ready` before print.

## Layout controls

- Body font slider max **20px** (~15pt). Optimizer targets compact defaults (~11px).
- Print CSS uses `RESUME_PRINT_LAYOUT_SPACING`.
- PDF via `puppeteer-core` + `@sparticuz/chromium`; Vercel `maxDuration: 60`.

## DOCX export

- DOCX uses Gill Sans MT; Word may substitute.
- Not pixel-identical to PDF.

## Mobile preview

- PDF Preview scales A4; overflow badge when local content exceeds one page.

## Generated drafts

- Delete is permanent. Draft edits never mutate inventory.

## Fit score (preview)

- **Resume–Job Fit** uses `preview-fit-heuristic-v1` — provisional.
- **Layout Fit (One Page)** heuristic is separate from server validation.
