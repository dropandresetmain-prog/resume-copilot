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
- **Wrapped line height** (`lineSpacing`, default **1.12** since v0.9.12C) vs **item spacing** (`itemLineSpacing`, default 1.2) are separate in print CSS.
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

## Mobile shell (v0.9.11I)

- Nav uses a **two-row mobile layout**: brand/version row, then a `grid-cols-5` nav row. No horizontal scroll; all 5 items fit at 390px. "Applications" uses short label "Apps" on mobile. Generate stays visually primary (dark pill).
- Desktop/tablet (sm+): original flex nav unchanged.
- Persistent storage warnings are **collapsible** on workspace pages — expand "Local data needs sync" for full text.

## Application Package (v0.9.11I)

- **Two-column desktop layout** (lg+): sticky 20rem action rail (review/approve/export) on left; resume PDF preview fills the right column in the first viewport. Cover letter, research, edit, and developer details are below the grid.
- **DRAFT_READY** is the default status on first page load after generation — neutral cyan, "Draft ready — approve to export." Red `NOT_READY_TO_EXPORT` is reserved for real post-approval failures.
- **Review details disclosure** collapses section checklists by default.
- **Approve → Export sequence** is explicit (Step 1 / Step 2 labels). Two-step section is single-column for narrow sidebar fit.
- **Screenshot timeout** (Package/Cover Letter): PDF preview iframes may still cause screenshot timeouts in browser automation. The two-column layout removes the section rail; the main content renders the PDF faster in the viewport. Accept Risk until confirmed in live signed-in QA.
- **Cover letter editor redesign** (Parked) — signed-in desktop and mobile captures needed before further restructuring.
- **Applications compact card quality** — not reviewable with unauthenticated screenshot pass. Accept Risk.

## Inventory cleanup (v0.9.13A)

- **Deterministic duplicate detection** groups likely variant bullets within the same role (`detectInventoryDuplicateGroups`). Signals: shared metrics, keyword overlap, normalized text similarity. Does **not** call Gemini and does **not** auto-delete bullets.
- **Detection limits:** Different roles or companies are never grouped; paraphrases without shared metrics may be missed (Accept Risk); enrichment AI duplicate hints remain separate.
- **User controls** on Inventory: Keep one, Hide from generation, Keep both, Mark alternate wording. Stored in existing `InventoryEdits` overlay — no Supabase schema change.
- **Generation respect:** `hiddenBulletKeys` excluded via `buildActiveCollatedInventory` before payload build. Existing drafts are not auto-regenerated.
- **Alternate wording flag** is informational only — does not change ranking yet (Accept Risk).
- **Parked:** full Inventory CRUD, AI-assisted merge of duplicates, bullet version history.

## Generate page (v0.9.12E)

- **Company** and **Target role** are primary visible fields above the JD textarea (v0.9.12D). Auto-extracted values still populate when the user has not manually edited those fields.
- **AI step estimate** appears above the Generate CTA — 1 step (resume only), 2 steps (resume + cover letter), or 3 steps + website fetch when combined mode uses website research.
- **Company research for this run** — radio choice: use website research when a company website is provided, or JD-only (skip website research). Wired to generation (`skipWebsiteResearch`); does not delete saved research on the application record.
- **Advanced options (optional)** collapse holds Job URL and Clear form only.
- **Mobile sticky CTA bar**: a `fixed bottom-0` Generate button appears on mobile only when not generating. Both sticky and inline CTAs may be visible when scrolled — Accept Risk.
- **JD textarea height**: `h-[6.5rem]` on mobile; `sm:h-auto` on desktop.
- **Readiness strip** shows readiness conditions (sign in, upload, paste JD, provider).
- **Recruitment firm / confidential client posting** checkbox (UI-only, disabled) — copy states future JD-only / skip-website behavior; **does not affect generation today**.

## AI call cost / observability (v0.9.12E)

- **Pre-run estimates count logical steps only** — retries, model fallback, and cover letter compression can add extra Gemini HTTP calls (Accept Risk until job ledger exists).
- **Server logging** — `[gemini-call]` JSON lines include logical step, model tier, actual model, attempt count, fallback flag, and error reason on failure. No prompts or API keys.
- **Client metadata** — API responses unchanged; attempt counts are log-only for this milestone.
- **Server idempotency** — double-submit guarded client-side (`isGenerating`, disabled buttons, `aria-busy`); no server-side idempotency keys (Investigate Now for v0.9.13+).
- **Durable AI job ledger** — not implemented (Parked).

## DOCX import (v0.9.12C)

- **Company-first comma formats** — disambiguated via company/role term heuristics; ambiguous pairs warn and downgrade confidence.
- **Date-first descriptor skip** — Full-time, Remote, etc. skipped before role/company line.
- **Title-case section headers** — Summary, Professional Summary, Profile, Objective, References preserved as unparsed sections.
- **Inline experience profile** (v0.9.12B) — "Role at Company — Date", pipe/comma formats, date-first blocks.
- **Two-line-column profile preserved** — original reference format still parses correctly.
- **Plain comma skills** split into `other` bucket with warning when unlabeled.
- **Education format** unchanged — still requires institution + date structure for structured parse.
- **Remaining import risks**: Google Docs collapsed spacing (Investigate Now); Canva/table DOCX (Accept Risk); comma pairs with no signals (Accept Risk).

## Cover letter output (v0.9.12C)

- **Prompt rules** now discourage em dashes and inflated corporate/AI phrasing in generation and revision.
- **Enforcement is prompt-level only** — no post-generation punctuation linter yet; model may still occasionally use em dashes (Accept Risk).
- **Banned phrase list** and word-limit validation unchanged.

## AI / export pipeline identity (v0.9.12A)

- **Founder identity removed from production pipeline** — prompts, validation, mocks, filenames, and test fixtures no longer assume "Min Htet" as the candidate.
- **Reference format generalization** — bullet format conventions (style, date patterns, two-column layout) were developed with the founder's resume as reference. v0.9.12B extended the parser to common non-founder formats; further improvement may be needed based on real-world testing.
- **candidateName** is derived from `header.fullName` on the resume draft — if AI omits or misparses the name, prompts fall back to "the candidate" / "[Candidate Name]" closing.
- **Cover letter validation signature check** is now opt-in (only fires when `candidateName` is provided to the validator). Validation callers that do not pass `candidateName` will not warn on missing signatures.

## Uploads page (Investigate Now — v0.9.11H)

- Duplicate sign-in messaging and admin-workbench layout remain. Parked for a focused Uploads flow pass; merge sign-in warnings and make the dropzone the clear first action.

## Inventory workflow (Investigate Now — v0.9.11F)

- **Duplicate cleanup, bullet variant management, force-exclude, and internship ranking** remain messy/confusing in the Inventory UI — intentionally **not** addressed in v0.9.11F or H.
- Enrichment/duplicate-review wording and actions need a dedicated source-of-truth milestone before further visual polish.
- **Recruitment firm / confidential client posting** checkbox exists on Generate (disabled) but does **not** affect generation yet — wire-up requires schema/generation policy decisions.

## Documentation

- **v0.9.8C** doc audit — README/roadmap were stale through v0.9.7; synced in this pass.
