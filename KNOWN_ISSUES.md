# Known Issues

## Export strategy (v0.7.0+)

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

## Layout controls (v0.7.1)

- Body font slider **10–20px** (default **12.5px**). Optimizer starts at 12.5px then tightens if needed.
- **Wrapped line height** (`lineSpacing`, default 1.08) vs **item spacing** (`itemLineSpacing`, default 1.2) are separate in print CSS.
- `itemLineSpacing` is optional in stored `exportLayoutSettings`; missing values default safely.
- Print CSS uses `RESUME_PRINT_LAYOUT_SPACING` (bullet padding reduced ~75% in v0.7.1).
- PDF via `puppeteer-core` + `@sparticuz/chromium`; Vercel `maxDuration: 60`.
- Default 12.5px body may require slider tuning to pass server one-page validation on dense drafts.

## DOCX export

- DOCX uses Gill Sans MT; Word may substitute.
- Not pixel-identical to PDF.

## Mobile preview

- PDF Preview scales A4; overflow badge when local content exceeds one page.

## Generate flow (v0.7.2+)

- **Generate page:** Paste JD → select base resume → **Generate Tailored Resume**. Job saves automatically (reuses duplicate saved jobs when content matches).
- **Records page:** Explicit Save/Update when editing saved jobs (unchanged).
- **Base resume** = formatting/reference template only; content from inventory.
- Last-used base resume stored in browser `localStorage` (`resumeCopilot.lastBaseResumeId.v1`) — no Supabase migration.

## Application workflow (v0.8.0)

- **Generate** creates or reuses `application_records` per `job_description_id` and links new drafts via `application_id`.
- Application status defaults to `drafting`; set to `resume_generated` after successful generate.
- **Records → Applications:** status dropdown, notes, open latest linked draft.
- **Draft History** shows only drafts without `application_id` (legacy/unlinked).
- **Parked:** lazy backfill of application records for old drafts, apply tracking UI, kanban.

## Cover letter & communications (v0.9.x)

- **Profile** (`/profile`) stores one Application Communication Profile blob per user.
- **Generate** can produce formal cover letter + secondary outreach formats (stored in `rationale` JSON).
- **Partial failure (v0.9.1):** cover letter failure preserves resume; retry cover letter only.
- **Quality (v0.9.2):** hard 420-word max; banned internal positioning phrases; company name normalization; quick revision on preview.
- **Company context** built from JD + user fields; no live web search — paste context in additional instructions.
- **Export** formal cover letter PDF/DOCX blocked when >420 words or banned phrases (client + server).
- **Investigate Now:** external web search API for company research.

## Inventory editing (v0.7.7+)

- **Active inventory overlay** on `InventoryState.edits` — does not mutate uploaded source resumes.
- **Edit Bullets** tab: exclude redundant bullets (e.g. 60+/80+/100+ variants), edit active wording, restore hidden bullets.
- **Collated view** reflects active inventory (hidden bullets omitted).
- **Regeneration** on resume preview: inspect `sourceRefs`, exclude generated bullets, force inventory bullets; updates same `generated_resume_drafts` row.
- **Enrichment accepted wording** copy clarifies it is preferred phrasing during generation.
- **Parked:** bulk duplicate cleanup automation, canonical metric governance UI, full manual resume editor.

## Generation input quality (v0.7.6)

- **Accepted wording** from enrichment review is sent per bullet (`acceptedWording`) — inventory source text is preserved separately.
- **Bullet cap (40)** applies after lightweight ranking: recent roles first, then source-backed / accepted-wording / JD-overlap bullets within each role. Not a fit rubric.
- **Approved keywords** are advisory (`usage: advisory_keyword_bank`) — not standalone evidence.
- **JD analysis** remains prompt-level; structured `selectionAudit` in rationale is optional metadata for debugging.
- **Parked:** JD-filtered keyword ranking, structured JD parse object, opportunity intelligence, auto keyword injection into inventory.

## Generated drafts

- Delete is permanent. Draft edits never mutate inventory.
- **Draft row policy (v0.7.1+):** `createGeneratedResumeDraftInCloud` on first AI generate; **regenerate** updates same row (`content`, `rationale`, `input_snapshot`, status `generated`); layout slider changes may set `layout_changed`; Approve persists `exportLayoutSettings`; manual content edits use `updateGeneratedResumeDraftInCloud`. No retention cleanup yet.

## Company context (v0.9.3)

- **Gemini only** — no live web search, scraping, or website fetch. Website URL is a naming/industry clue only.
- **Per-application scope** — context on `application_records`, not a global company database.
- **Must save before generation uses it** — generated-but-unsaved context is not injected into resume/cover letter.
- **Confidence** — model may infer mission/vision/values; user should review limitations array.
- **Migration required** — `20260623_application_company_context_v093.sql` must be pushed to live Supabase.

## Cover letter / communication (v0.9.x)


- **Resume–Job Fit** uses `preview-fit-heuristic-v1` — provisional.
- **Layout Fit (One Page)** heuristic is separate from server validation.
