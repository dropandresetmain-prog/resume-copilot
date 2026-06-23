# Known Issues

## Export strategy (v0.7.0+)

- **Server PDF page count is export truth** — Puppeteer + `pdf-lib` validation on Approve and hard block on PDF export when `pageCount > 1`.
- **PDF Preview** is the closest **local** approximation (browser fonts, screen layout). It can disagree with server PDF at the one-page boundary.
- **Heuristic `estimatePageFit()`** is non-authoritative — shown separately from server validation.
- Approve runs server PDF generation (~3–15s cold on Vercel) — validating state shown in UI.
- **Post-approval layout edits** set `layout_changed` and clear `serverPdfValidation`; re-approve required.
- **DOCX** is secondary/editable — no one-page server gate; may reflow in Word.
- PDF/DOCX delivery uses blob download with structured filenames (v0.9.7+).
- Export APIs use shared `buildExportResumeDocumentModel()` + `resolveExportDocumentModelForDraft()` (loads application company context for naming).

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
- Default 12.5px body may require slider tuning to pass server one-page validation on dense drafts.

## DOCX export

- DOCX uses Gill Sans MT; Word may substitute.
- Not pixel-identical to PDF.

## Generate flow (v0.7.2+)

- **Generate page:** Paste JD → select base resume → **Generate** (resume only or combined). Job saves automatically.
- **Base resume** = formatting/reference template only; content from inventory.
- Last-used base resume in browser `localStorage` (`resumeCopilot.lastBaseResumeId.v1`).

## Application workflow (v0.8.0+)

- **Generate** creates or reuses `application_records` per `job_description_id`; links drafts via `application_id`.
- Post-generate navigation lands on **application package** (`/resume-preview/{id}`).
- **Draft History** shows only drafts without `application_id` (legacy/unlinked).
- **Package Review Center** (v0.9.11E) always surfaces a cover letter action path: "Edit cover letter" when a cover letter exists, "Go to cover letter" anchor to the package section when missing.
- **Post-generation editing flow remains structurally heavy** (v0.9.11D/E): action placement and surface clarity improved, but resume edit, cover letter edit, revision, approval, and export still need a deeper workflow redesign.
- **Parked:** lazy backfill for old drafts, kanban, apply tracking UI.

## Resume structure auto-repair (v0.9.8B)

- Gemini output with 5+ roles or bullet overages is **auto-repaired** before save — no longer hard-fails.
- Repaired drafts: `status: needs_review`, `resume_structure_needs_review` flag, amber banner on package page.
- Dropped roles move to Additional Experience as `Company: Role — detail` lines — may need manual polish.
- Repair ranking uses JD keyword overlap (same family as generation bullet ranking) — not ML; edge cases may drop wrong role.
- **Hard-block remains:** no work experience, missing Skills/Languages/Interests groups, unparseable JSON, additional experience that cannot normalize.
- `needs_review` does **not** block approve/export — user must read repair banner.

## Cover letter (v0.9.x)

- **Profile** (`/profile`) stores Application Communication Profile.
- **Partial failure (v0.9.1):** cover letter failure preserves resume; retry without regenerating resume.
- **Quality gates:** 420-word max; banned phrases; company URL detection in prose.
- **Architecture (v0.9.7):** story ranking + explicit bridges; validation may return 422 — user retries.
- **Export** blocked when over word limit or banned phrases (client + server).
- Hostname-derived brand may be `Shelfperfect` vs marketing `ShelfPerfect` without saved research `displayName`.

## Company research (v0.9.5–v0.9.6)

- **Firecrawl** is server-side only — requires `FIRECRAWL_API_KEY`.
- **Automatic in combined flow** when website provided and no website-backed research saved.
- **JD-only saved context** does not block Firecrawl when user later adds a website.
- **Job posting URLs** are not scraped as company homepages.
- **Scrape failure** falls back to JD-based context; does not block resume generation.
- **Manual research panel** optional (collapsed Advanced on Generate; expandable on package page).
- **Parked:** Tavily/Serper/Perplexity; reuse research across roles at same company.

## Company context (v0.9.3–v0.9.4)

- **Per-application scope** — stored on `application_records.company_context`, not a global company DB.
- **Gemini synthesizes** context from JD and/or Firecrawl scrape text.
- **Auto-generation** in combined mode when no usable context; failure is non-blocking (JD fallback + warning).
- **503 / high demand** — retried via `callGeminiWithRetry`.
- User should review `limitations` array and collapsed research summary before trusting cover letter facts.

## Inventory editing (v0.7.7+)

- **Active inventory overlay** on `InventoryState.edits` — does not mutate uploaded source resumes.
- **Edit Bullets** tab: exclude redundant bullets, edit active wording, restore hidden bullets.
- **Regeneration** on application package: exclude/force bullets; updates same draft row.
- **Parked:** bulk duplicate cleanup, canonical metric governance, full structured resume editor.

## Generation input quality (v0.7.6)

- **Accepted wording** from enrichment review sent per bullet — inventory source text preserved separately.
- **Bullet cap (40)** with lightweight ranking before prompt assembly.
- **Approved keywords** advisory only — not standalone evidence.
- **Parked:** JD-filtered keyword ranking, structured JD parse, opportunity intelligence.

## Generated drafts

- Delete is permanent. Draft edits never mutate inventory.
- **Draft row policy:** `create` on first generate; **regenerate** updates same row; status `generated` or `needs_review`; layout edits may set `layout_changed`.
- No retention/cleanup automation yet.

## Fit heuristics

- **Resume–Job Fit** uses `preview-fit-heuristic-v1` — provisional, not export gate.
- **Layout Fit (One Page)** browser estimate is separate from server validation.

## Inventory workflow (Investigate Now — v0.9.11F)

- **Duplicate cleanup, bullet variant management, force-exclude, and internship ranking** remain messy/confusing in the Inventory UI — intentionally **not** addressed in v0.9.11F.
- Enrichment/duplicate-review wording and actions need a dedicated source-of-truth milestone before further visual polish.
- **Recruitment firm / confidential client posting** checkbox exists on Generate (disabled) but does **not** affect generation yet — wire-up requires schema/generation policy decisions.

## Documentation

- **v0.9.8C** doc audit — README/roadmap were stale through v0.9.7; synced in this pass.
