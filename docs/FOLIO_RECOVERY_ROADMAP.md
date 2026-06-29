# Folio Recovery Roadmap

**Status:** Planning complete — no code has been changed.
**Production main:** `a4d17e3` (v0.9.19B) — untouched throughout Folio work.
**Active development branch:** `folio-recovery` (from `folio-claude-stable` `7aec1d0`).
**Reference only:** `archive/folio-codex-v1` (`d71d353`) — never merged or cherry-picked wholesale.

> Every implementation session must read this document at the start and update the
> Milestone Completion Log and the next-chat prompt at the end before closing.

---

## Session Protocol

1. **Questions first.** Each implementation chat opens with questions to the user to clarify scope before writing any code. Do not begin coding until the user has answered.
2. **Handoff prompt in, handoff prompt out.** Each chat opens with the closing prompt from the previous chat and closes by writing the opening prompt for the next chat into this document's Chat Prompts section.
3. **Chat boundaries.** Close a chat after one milestone is verified and the next prompt is recorded. Do not batch two milestones.
4. **This document is the source of truth.** If anything in the conversation or a commit message contradicts this document, flag it and update this document before continuing.

---

## Development Branch

```bash
# Current active branch (already created):
git checkout folio-recovery

# Confirm you are NOT on main:
git branch --show-current   # must print: folio-recovery

# Production main stays at:
git show main --oneline -1  # a4d17e3
```

Merge policy: each milestone lands on `folio-recovery` after passing tests and independent review. `folio-recovery` → `main` only after M8 authenticated parity passes.

---

## 1. Executive Diagnosis

Resume Copilot is three systems layered together:

1. **Career evidence system** — resume import, parsing, inventory, overlays, enrichment, cleanup, evidence ranking and story spines.
2. **Application-generation system** — job intake, company research, resume generation, cover-letter generation, revision and regeneration.
3. **Trust and delivery system** — review, approval, one-page validation, export, application records, save states, partial-failure recovery and auditability.

The behavior (systems 1–3) is mature and lives in the pre-Folio code on `main` (`a4d17e3`, v0.9.19B). The presentation (Folio: sidebar shell, Dashboard, Career Vault, New Application, Output Editor, real auth pages, onboarding) is mature on `folio-claude-stable` (`7aec1d0`). The two were never fully reconciled.

**`folio-claude-stable` is in better shape than the post-redesign audit implies.** The Folio tip already:
- Mounts the correct Folio client on every active route.
- Navigates Generate → `/output/[draftId]` canonically (fixed in tip commit `7aec1d0`).
- Has working sign-out in `AppNav.tsx`, wired "Add a job" CTA, signup → `/auth/confirm-email` branch, and a `profiles` migration (`20240001_profiles.sql`) matching the onboarding write shape.

So the three blocking items (B1 sign-out, B2 signup race, B3 profiles table) from `AUDIT_CLAUDE_POST.md` are already fixed at the Folio tip.

**The real remaining gap** is capability depth in two surfaces:

1. **Output Editor (`/output`) is thin.** It has resume regeneration, experience toggles, cover-letter tab, mark-sent, and downloads. It is missing the entire trust/delivery layer: approval, server one-page PDF gate, export-fit reconciliation, structured editing, evidence controls, revision queue, and tailoring diagnostics. This is the deepest hole and the highest data/trust risk.
2. **Career Vault and Applications lost depth** (`D2`, `D1`): enrichment review, duplicate/project cleanup, source-resume audit (Vault); saved jobs, draft history, status/notes editing (Applications).

The rollback happened because the method to recover that depth was to remount the old page clients at the live routes — which deleted the redesign. The fix is to decompose the legacy capabilities into the Folio clients, treating the old clients strictly as behavioral references.

---

## 2. Corrections / Additions to `POST_ROLLBACK_AUDIT.md`

| # | Audit statement | Correction (code-verified) |
|---|---|---|
| C1 | Implies `/resume-preview` is the heavy page to decompose | Confirmed and sharpened: on `folio-claude-stable`, Generate already routes to `/output/[draftId]`. `/resume-preview` (`ResumePreviewPageClient`) is off the main path and is now the behavioral reference. Decomposition target is `OutputEditorPageClient`. |
| C2 | Auth/sign-out not discussed as resolved | `AUDIT_CLAUDE_POST.md` B1/B2/D5 are fixed at the Folio tip. Do not budget work to "restore sign-out." Verify only. |
| C3 | "`profiles` table may not exist" | Migration exists (`supabase/migrations/20240001_profiles.sql`) with correct columns. Remaining risk is runtime: is it applied to the live Supabase project? → Investigate Now, not a code milestone. |
| C4 | Onboarding upload listed under "real upload" parity | Still genuinely broken (`D3`): `onboarding/page.tsx` collects `file` in state but `handleFinish` only upserts `profiles` — the resume is never parsed or stored. Real upload lives in Career Vault. |
| C5 | "fake Interview filter" | Confirmed (`S2`): `ApplicationsPageClient.tsx:47` hardcodes `return []` for `interview`; no `interview` status in `application-record.ts`. |
| C6 | Model tiers treated as settled | `enhanced` = `gemini-3-flash-preview`, `premium` = `gemini-3.5-flash` — **IDs verified stable (2026-06-28)**. Add runtime guardrail/diagnostic logging before M5b tier UI so fallback failures are traceable. No behavior change until M5b. |
| C7 | Backend engines "may be reused" | Stronger: all API routes are connected and intact across both branches. Parity work is almost entirely UI re-wiring + trust-state surfacing, not backend rebuilds. |

---

## 3. Rollback Root-Cause Analysis

**Mechanical cause (confirmed):** Two Codex commits swapped route entry points back to legacy clients:

- `d71d353` — `inventory/page.tsx`: `CareerVaultPageClient` → `InventoryPageClient`.
- `bc2fb9f` — `records/page.tsx`: `ApplicationsPageClient` → `RecordsPageClient`.

Both diffs are a one-line import swap. That is the entire failure surface.

**Process causes:**

1. Milestones were framed as *restore page X*, making "swap the import" look like success.
2. No approved capability matrix existed — "preserve functionality" was read as "reuse legacy composition."
3. Legacy clients were treated as reusable screens, not behavioral references.
4. No route-contract test asserted that `/inventory` renders `CareerVaultPageClient`. A two-line test would have failed the swap in CI.
5. Trust/persistence behavior and UI composition were conflated.

---

## 4. Capability Decision Matrix

**Key:** KV keep visible · PD progressive disclosure · BE backend-only · MERGE · SIMPLIFY · PARK · REMOVE · INV Investigate Now.

### Landing / Auth / Onboarding

| Capability | Old location | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|---|
| Email/password, magic link, OAuth, reset | AuthPanel `/setup` | `/auth/*` pages | App unusable | **KV** — verify only |
| Auth-aware landing routing | `LandingCta` | `LandingHero` static links | Low (annoyance) | **SIMPLIFY** — add redirect for signed-in users (`D6`) |
| Onboarding resume upload + parse | Vault | ⚠️ **Live honesty risk** (`D3`): `handleFinish` in `onboarding/page.tsx` upserts `profiles` only — file is silently discarded; user believes resume was parsed/stored | High — user thinks resume loaded | **Honesty fix required before M7**: hide or label upload step "not yet connected" until real implementation; full fix M7 |
| LinkedIn import (onboarding) | — | stub option (`S5`) | None | **REMOVE/PARK** |
| `/setup` legacy uploads page | ManageUploads | orphaned, unprotected | Low | **MERGE/REMOVE** |

### Dashboard

| Capability | Folio counterpart | Rec | Note |
|---|---|---|---|
| Application list + vault health % | `DashboardPageClient` | **KV** | Verify counts are real. INV on `issueTitle`/count linkage (`U1`). |

### Career Vault (`/inventory`)

| Capability | Old location | Folio counterpart | Usage | Risk if omitted | Rec |
|---|---|---|---|---|---|
| DOCX upload + parser honesty (partial/failed) | `/setup` UploadCard | Wired in Vault dialog | High | High (silent bad parse) | **KV** |
| Collated tabs (Work/Skills/Edu/Additional) | InventoryPageClient | Present | High | — | **KV** |
| Non-destructive overlay edit / hide / restore | InventoryEditPanel | Inline edit partial; restore/hide partial | High | High | **KV** |
| Add-from-Text (extract→review→apply) | `/inventory` | Present (`InventoryTextExtractionPanel`) | Med | Med (silent save) | **KV** — enforce extract≠save |
| AI enrichment review | EnrichmentReviewPanel | ⚠️ Done [M2] — `EnrichmentReviewPanel` mounted wholesale behind "Vault management tools" PD; **accepted temporary debt** (legacy slate-styled, not Folio-native tokens) | Med | Med | **PD — restyle/decompose → M5b** |
| Duplicate cleanup | InventoryDuplicateCleanupPanel | ⚠️ Done [M2] — same; `InventoryDuplicateCleanupPanel` slate-styled panel behind PD | Med | Med | **PD — restyle/decompose → M5b** |
| Project-pollution cleanup | InventoryProjectCleanupPanel | ⚠️ Done [M2] — same; `InventoryProjectCleanupPanel` | Low-Med | Med | **PD — restyle/decompose → M5b** |
| Source-resume / parsed-debug audit | SourceResumesView | Missing | Low | Low | **PARK (M7 / v0.10.0)** |
| "Add bullet point" button | — | dead button (`S4`) | — | — | **REMOVE or wire → M7** |
| Full Inventory CRUD | — | parked | — | — | **PARK** (v0.10.0) |

> **M4.5 debt note:** `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, `InventoryTextExtractionPanel`, and `UploadCard` are all legacy `setup/` components (slate-styled, ~176 `slate-*` uses across the folder, ~5 `folio-*`). They are wired correctly and functional. Their reuse is **accepted temporary debt** per §6 safeguard update; restyle/decomposition is assigned M5b. `shadow-md` on Vault FAB buttons also violates DESIGN.md — fix in M5b restyle pass.

### Generate (`/generate`)

| Capability | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|
| Company/role/JD intake + metadata extract | `NewApplicationPageClient` + embedded `GenerateTailoredResumeSection` | High | **KV** |
| Saved-job save/reuse/duplicate handling | ✅ Done [M3] — match banner + reuse/start-fresh wired | Med | **KV** |
| Context-policy visibility (JD-only vs website+JD vs confidential) | ✅ Done [M3] — `generate-context-policy-summary` in embedded mode | Med (stale research leak) | **KV** |
| Website discovery (Firecrawl, billable) | `CompanyWebsiteDiscoveryPanel` kept — wiring in embedded mode **unverified** | Med | **PD — verify in M5b or park if confirmed absent** |
| Output mode (resume / resume+CL) | Present | Low | **KV** |
| AI step cost estimate | ⚠️ **Missing** — not visible in Folio Generate flow; "Present" was an incorrect matrix entry; confirmed M3 gap | Low-Med | **KV → M4.6** |
| Partial-failure recovery (CL fails, resume kept) | ✅ Done [M1/M3] — `0877eb2` ported; full suite pass confirmed M3 | **High** | **KV** |
| Model-tier selector | `ModelTierSelect` component exists; **no active UI in Generate flow** — state is read from storage but `setResumeModelTier`/`setCoverLetterModelTier` are never called in render; selector only appears inside unmounted M5 reference panels | Low | **INV (C6 ID stability) → M5b if IDs stable** — investigate before exposing any tier UI; see §9 M4.5 decision table |
| Cover-letter-only mode | disabled | — | **PARK** |

### Output — Resume (`/output/[draftId]`)

| Capability | Old location (reference only) | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|---|
| Persisted resume load + reload-by-URL | ResumePreview | ✅ Done [M4] — `loadFailed` vs `notFound` honest; context-fetch isolated | High | **KV** |
| **Approve-for-export sequence** | ApplicationReviewCenter | ✅ Done [M4] — `output-approve-export` two-step card; persists `status="approved"` | Critical | **KV** |
| **Server one-page PDF gate (Puppeteer, 422 block)** | `/api/approve`, `/api/validate` | ✅ Done [M4] — `output-one-page-block` with actionable suggestions; topbar exports gated on `exportReady` | Critical | **KV** |
| **A4 / PDF-truth resume preview** | `ResumePdfPreview` (A4 iframe, exists at `src/components/resume-drafts/ResumePdfPreview.tsx`) | **Two-mode [M4.5+]:** (1) Editing view = current `RenderedResume` formatted HTML — acceptable for bullet switching/editing, no change required; (2) Approve-for-export = show `ResumePdfPreview` after gate passes — renders exact Puppeteer HTML in A4-constrained iframe | High | **KV → M5a** |
| Export-fit reconciliation (browser vs server, fix suggestions) | ExportFitStatusPanel | Missing — reference only | High | **PD → M5b** |
| PDF/DOCX export (approved, structured filenames) | export routes | ✅ Done [M4] — gated on `exportReady`; structured filenames; private storage delivery | Critical | **KV** |
| Repair banner (`needs_review`) | ResumePreview | ✅ Done [M4] — `output-needs-review-banner` before approve CTA | High | **KV** |
| Structured section/header editing + dirty/beforeunload + re-approval invalidation | ResumeDraftReviewWorkspace | Missing | High | **PD → M5a** |
| Resume revision queue (batch scoped) | ResumeStagedCustomRevisionPanel | Missing | Med | **PD → M5a** |
| Evidence controls (exclude/force/rewrite/regenerate, pending queue) — **line-level** | ResumeEvidenceRegenerationPanel | Whole-job experience toggles only [M4] — line-level pending | Med-High | **PD → M5b** (whole-job acceptable at M4; line-level is M5b scope) |
| Tailoring diagnostics (selected/omitted/proof/warnings) | PackageTailoringDiagnosticsPanel | Missing | Med | **PD → M5b** |
| Fit summary | PackageFitSummaryPanel | Missing | Med | **PD → M5b** |
| Layout sliders | layout controls | Missing — parked | Low-Med | **PARK** |

### Output — Cover Letter (`/output` CL tab + `/cover-letter-preview`)

| Capability | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|
| Load CL by resume draft id; failed-load ≠ absent | ✅ Done [M1] — `0877eb2` ported; error + retry shown, no draft created on failure | High (duplicate drafts) | **KV** |
| Manual edit + dirty/save/beforeunload | Partial — full implementation pending | Med | **KV → M5c** |
| Quick revision chips + candidate preview accept/reject | Partial (`CoverLetterStagedRevisionPanel`) | Med | **PD → M5c** |
| Pending-only evidence staging (use/avoid proof) | `CoverLetterEvidenceRegenerationPanel` kept | Med | **PD → M5c** |
| Full regenerate in place | Engine present — Folio wiring pending | Med | **KV → M5c** |
| Export PDF/DOCX (420-word + banned-phrase gate) | ⚠️ **LIVE BUG confirmed [M4.5+]**: `detectBannedPhrases` not imported in `OutputEditorPageClient`; download buttons gated only on `isBusy \|\| !body.trim()`; `overLimit` shown as red text only (not used to block export); banned-phrase check absent entirely | High | **KV — fix before M5a (M4.6)** |
| Secondary formats (email/LinkedIn/DM/WhatsApp) | `SecondaryCommunicationsPanel` kept | Low | **PD → M5c / park** |
| Schema-constrained CL Gemini output (`56bc7c5`) | ✅ Done [M1] — cherry-picked, `responseSchema` + `COVER_LETTER_RESPONSE_SCHEMA` in place | Med | **PORT (BE)** |

### Applications (`/records`)

| Capability | Old (reference only) | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|---|
| Persisted records table + filters | RecordsPanel | `ApplicationsPageClient` present | High | **KV** |
| Status edit + notes | ApplicationRecordsPanel | **Missing** (`D1`) | Med | **KV → M6** |
| Artifact presence/missing labels + open package/CL | RecordsPanel | Partial | Med | **KV → M6** |
| Archive-without-delete | RecordsPanel | ✅ Done — `archiveApplicationRecordInCloud` present | Med | **KV** |
| Saved-job management | JDInputPanel | **Missing** | Low-Med | **PD → M6** |
| Unlinked draft history + delete/export | DraftHistoryPanel | **Missing** | Low | **PD → M6** |
| "Interview" filter | — | stub `return []` (`S2`) — live fake surface | — | **REMOVE or add status → M7** |

### Profile / Settings / Secondary

| Capability | Folio counterpart | Rec |
|---|---|---|
| Communication Profile (tone/voice) | `ProfilePageClient` present | **KV / SIMPLIFY** |
| Settings | stub (`S1`) | **SIMPLIFY** — minimal account + prefs, or hide |
| Dev Tools | `notFound()` in prod | **KV (gated)** |
| TopBar avatar/notifications | decorative (`S3`) | **REMOVE/PARK** |

### Preview Routes — `/resume-preview` and `/cover-letter-preview` (policy, M4.5)

These routes were listed in the forbidden-remount test comment as intentionally out of scope. **Policy settled in M4.5:**

| Route | Client | Status | Policy | Retire |
|---|---|---|---|---|
| `/resume-preview/[draftId]` | `ResumePreviewPageClient` | Grandfathered secondary route — not linked from active Folio navigation; reachable by direct URL only | **Permitted secondary route** until M5a structured editing lands in `/output` | **M7** |
| `/cover-letter-preview/[draftId]` | `CoverLetterPreviewPageClient` | Same — CL editing partially absorbed into Output CL tab; carries full editing until M5c | **Permitted secondary route** through M5c | **M7** |

Neither client is imported by any active `page.tsx` — the route-contract test stays green. The §10 forbidden list should clarify that these are **grandfathered** (not newly forbidden), not reinstated. Retire both in M7 after `/output` reaches M5c parity.

### Backend-only / Shared Systems (keep regardless of UI)

Evidence spine (`evidence/spine.ts`, story-spine), resume quality/repair pipeline, export engine (canonical doc model, Puppeteer page-count truth, structured filenames, private storage), company-context research, Gemini retry/fallback. Schema-constrained CL output (`56bc7c5`) joins this set. All **BE, KEEP**.

---

## 5. Minimum Pre-Folio Parity Contract

Parity = a returning authenticated user with existing data can run the full job-application loop on Folio with trustworthy states. It does **not** mean every old panel returns.

1. **Core job-application path** — Sign in → Career Vault (upload/parse OR existing inventory) → Generate (JD + base resume + context policy) → Output (resume + cover letter) → **Approve** → **Export PDF/DOCX** → Applications shows the record. Every hop reachable by direct URL reload.
2. **Data / source-of-truth safety** — Source resumes never mutated; overlay edits live in `InventoryEdits`; Add-from-Text is extract→review→apply (extraction never saves); project-like evidence never silently enters Work Experience; a failed persisted read is never treated as "empty."
3. **Generation quality** — Evidence spine runs before generation; repair pipeline runs; `needs_review` is surfaced; schema-constrained CL output applied.
4. **Review / approval / export trust** — **Server one-page PDF gate is the export truth and hard-blocks (422).** Approval state is explicit; post-approval edits invalidate approval; structured filenames; private storage delivery. No export path bypasses the gate.
5. **Recovery / failure handling** — Partial AI failure preserves the resume and offers CL-only retry; save failures are explicit; identity change re-scopes data; direct reload restores generated work.
6. **Useful-but-nonessential tooling** (PD, not parity-blocking) — enrichment review, duplicate/project cleanup, revision queue, evidence controls, tailoring diagnostics, fit summary, layout sliders, saved-job/draft-history panels, secondary formats.
7. **Debug/dev-only** (not in product) — source-resume debug, dev-tools, model-selection debug, provider inspection.

**Trust-state vocabulary** that must be explicit everywhere: *saved · pending · preview-only · destructive · billable · failed · applied · approved · needs-review.*

---

## 6. Non-Negotiable Rules (never violate in any implementation)

- The Folio UI, layout, hierarchy, navigation and page clients are the visual/product baseline.
- **Never replace an active Folio route with a legacy page client.**
- **Never restore functionality by mounting an old page wholesale.**
- Legacy components may be inspected as behavioral references only.
- Existing backend engines and persistence helpers may be reused when appropriate.
- Preserve source-of-truth, persistence, normalization, generation, approval and export semantics.
- Do not assume every historical feature deserves restoration.
- Make saved, pending, preview-only, destructive, billable, failed and applied states explicit.
- Add-from-Text: extract → review/edit → apply. Extraction alone never saves.
- Project-like evidence must not silently enter Work Experience.
- Package-level surfaces are for review, approval and export.
- **Legacy sub-panel reuse requires explicit approval.** Mounting a legacy `setup/` component verbatim inside an active Folio route counts as wholesale legacy reuse unless logged as accepted debt in the Milestone Completion Log. "Behind a disclosure accordion" is not automatically compliant. Accepted debt must record: affected components; reason accepted; owner milestone for restyle/decomposition; whether it blocks the next milestone.
- **Visible UI must be Folio-native or logged as debt.** Legacy behavior (data wiring, persistence logic) may be reused. Legacy slate-styled rendering must not ship without a restyle plan. Currently logged debt: `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, `InventoryTextExtractionPanel`, `UploadCard` — slate-styled panels in Career Vault PD section [M2]; restyle deferred to MX (optional, after M8); does not block M5a–M8.

---

## 7. Later-Codex Commit Classification

| Commit | Subject | Classification | Action |
|---|---|---|---|
| `56bc7c5` | Constrain Gemini CL output schema | **Port as-is** | Cherry-pick into M1. Re-run `cover-letter` + `gemini-retry` suites. |
| `0877eb2` | Canonical generate→output handoff | **Port as-is (Folio-native)** | Cherry-pick into M1. Keep its tests. |
| `bc2fb9f` | Restore persisted applications | **Reject route swap; salvage panel behavior** | The `records/page.tsx` swap is the rollback cause — reject it. `ApplicationRecordsPanel` changes are behavioral reference for M6. |
| `d71d353` | Restore persisted Career Vault | **Reject route swap; salvage state contract** | `inventory/page.tsx` swap — reject. `InventoryPageClient` + `WorkspaceProvider` additions are references for M2. |

---

## 8. Milestone Sequence

| # | Milestone | Why here | Risk |
|---|---|---|---|
| **M1** | Foundation lock, route-contract safeguards, safe backend ports | Prevents recurrence before any feature work; ports only safe Codex commits | Low-Med |
| **M2** | Career Vault minimum parity | Input gate; `D2` is a real degradation | Med |
| **M3** | Generate minimum parity | Produces trustworthy drafts | Med |
| **M4** | **Output core delivery** | Critical trust/export milestone; biggest gap; server gate must land here | **High** |
| **M4.5** | **Post-M4 capability matrix reconciliation** | Roadmap-only: close matrix gaps, assign milestone owners, document accepted debt, settle preview-route policy — before M5a | Low |
| **M4.6** | **Pre-M5a bug fixes + M3 gap closure** | CL gate live correctness bug; AI step cost M3 gap; onboarding trust label; model guardrail | Low |
| **M5a** | Output: structured edit + revision queue + PDF-on-approve preview | Editing depth after core trust; `ResumePdfPreview` shown after Approve gate passes | Med |
| **M5b** | Output: evidence controls + tailoring diagnostics + fit summary + model-tier | PD depth; model-tier UI (IDs verified stable) | Med-High |
| **M5c** | Cover-letter editing, evidence staging, export gates | CL trust closure | Med |
| **M6** | Applications parity | Closes `D1` | Med |
| **M7** | Secondary surfaces & stub cleanup | Honesty pass | Low-Med |
| **M8** | Authenticated E2E closure | Proves parity | — |
| **M9** | E2E fix batch | Quick wins from M8 E2E findings: Dashboard, Applications columns/labels/summary, Career Vault layout + copy, Profile icons | Low |
| **MX** | Career Vault overhaul | Closes visual + structural debt; layout reorganization + feature ports from legacy upload page; scope expanded from restyle-only | Low-Med |
| **M10a** | Output Editor redesign — design session | UX architecture decisions before any implementation; no code produced | Med |
| **M10b** | Output Editor redesign — implementation | Implement agreed design; independent review required before merge | High |

---

## 9. Milestone Specifications

### M1 — Foundation Lock, Route-Contract Safeguards, Safe Backend Ports

- **Objective:** Lock the Folio baseline against regression; import the two safe Codex commits before any capability work.
- **User-visible outcome:** None intended. CL generation becomes more reliable; Output CL tab no longer risks duplicate drafts on a failed read.
- **Approved capabilities:** (a) route-contract + forbidden-remount safeguards; (b) `56bc7c5` schema-constrained CL output; (c) `0877eb2` Output CL load-failure trust; (d) verify persisted-reload + auth.
- **Folio clients that stay mounted:** all five active route clients — unchanged.
- **Legacy used only as reference:** none.
- **Backend/Supabase deps:** `call-gemini.ts`, `cover-letter-gemini.ts`; `profiles` migration (verify applied); draft/record tables for reload checks.
- **Relevant files:** `src/app/(workspace)/*/page.tsx`, `src/components/app/nav.ts`, `src/middleware.ts`, `src/lib/ai/call-gemini.ts`, `src/lib/ai/cover-letter-gemini.ts`, `src/components/pages/OutputEditorPageClient.tsx`, `tests/suites/app-shell.test.ts`, `cover-letter.test.ts`, `gemini-retry.test.ts`, `generation-partial-failure.test.ts`.
- **Persistence/source-of-truth risk:** Low. No schema change; `56bc7c5` adds an optional `responseSchema`; `0877eb2` only changes load-state handling.
- **Implementation boundary:** Cherry-pick `56bc7c5` and `0877eb2`; add route-contract + forbidden-remount tests; verify persisted-reload behavior.
- **What must not change:** route→client mounts, generation/export semantics, approval/export gates, model IDs.
- **Behavior tests:** route renders correct Folio client (×5); no `page.tsx` imports a forbidden legacy client; CL output conforms to schema; failed CL load shows error + retry and does **not** create a draft.
- **Manual checks (desktop + mobile):** sign in/out; signup → `/auth/confirm-email`; reload `/output/[draftId]`, `/inventory`, `/records` directly while authed.
- **Authenticated E2E requirement:** sign in → open an existing draft at `/output/[draftId]` → confirm resume + CL load survive reload.
- **Definition of done:** safeguards green in `npm run test`; both commits ported with passing suites; persisted reload verified; forbidden-remount rule documented in `docs/FOLIO_REDESIGN.md`.
- **Dependencies:** none.

---

### M2 — Career Vault Minimum Parity

- **Objective:** Trustworthy evidence in.
- **Outcome:** DOCX upload/parse with explicit partial/failed states; overlay edit/hide/restore fully wired; Add-from-Text enforce extract≠save; selected cleanup tools under PD.
- **Stays mounted:** `CareerVaultPageClient`.
- **References (read only):** `InventoryPageClient`, `InventoryEditPanel`, `InventoryTextExtractionPanel`, `d71d353` WorkspaceProvider state additions.
- **Deps:** `resume_inventories`, `stored_files`, `original-resume-files`, `InventoryEdits`, `parseDocxResume()` (client-side).
- **Must not change:** source resumes never mutated; spine/payload.
- **Tests:** extend `inventory-edits`, `inventory-text-extraction`, `draft-inventory-safety`; route-contract for `/inventory`.
- **Manual:** desktop/mobile upload, parse-fail, overlay restore.
- **DoD:** parity contract §2 holds for Vault.
- **Dependencies:** M1.

---

### M3 — Generate Minimum Parity

- **Objective:** Trustworthy draft production.
- **Outcome:** Saved-job save/reuse; visible context policy; partial-failure recovery (resume kept, CL retry).
- **Stays mounted:** `NewApplicationPageClient` + embedded `GenerateTailoredResumeSection`.
- **References:** `GeneratePageClient`.
- **Deps:** `job_descriptions`, `application_records`, draft tables, company-context engine, Firecrawl.
- **Must not change:** context-policy semantics, cost estimates, generation engine.
- **Tests:** extend `generate-flow`, `generation-partial-failure`, `application-records`.
- **DoD:** context mode explained pre-generation; partial failure never loses the resume.
- **Known gap [M4.6]:** AI step cost estimate was listed as "Present" in the capability matrix but is not visible anywhere in the Folio Generate flow — confirmed absent. Add in M4.6.
- **Dependencies:** M1.

---

### M4 — Output Core Delivery (Critical)

- **Objective:** Trustworthy approve + export in Folio.
- **Outcome:** Approve-for-export sequence; **server one-page PDF hard gate (422)**; PDF/DOCX export with structured filenames + private storage; `needs_review` repair banner; mark-application-sent; failed-load vs missing honesty.
- **Stays mounted:** `OutputEditorPageClient`.
- **References (read only):** `ResumePreviewPageClient`, `ApplicationReviewCenter`, `ExportFitStatusPanel`.
- **Deps:** `/api/approve/resume-draft`, `/api/validate/resume-pdf`, `/api/export/resume-*`, `generated-documents`.
- **Persistence risk:** approval/validation state and `layout_changed` invalidation must round-trip; export must not bypass the gate.
- **Must not change:** export engine, page-count truth, filename scheme.
- **Tests:** extend `resume-approve-validation`, `resume-pdf-page-count`, `resume-export-delivery`, `application-package-ux`; route-contract for `/output`.
- **Manual:** approve→export on a dense draft (force overflow), reload mid-flow, desktop/mobile.
- **Authenticated E2E required.**
- **DoD:** no export path bypasses the one-page gate; approval invalidates on edit.
- **Known gap [M4.5]:** Visual resume preview is screen-scaled HTML (`RenderedResume` component) — not A4/PDF-truth faithful. Server Puppeteer one-page gate remains the export truth per parity contract §4. A4/PDF-truth visual preview is a capability gap logged in M4.5 and assigned to M5a.
- **Dependencies:** M2, M3 (Generate must produce trustworthy drafts before Output approval is tested end-to-end).
- **Independent Opus review before merge: required.**

---

### M4.5 — Post-M4 Capability Matrix Reconciliation

- **Objective:** Reconcile the Capability Decision Matrix, M1–M4 implementation reality, and the original post-rollback audit before proceeding to M5a. No application code changes in this milestone.
- **Why this exists:** M4 is complete for export trust, but the roadmap has five specification gaps that, if left open, will surface as scope ambiguity in M5a–M5c: (1) model-tier selector has no milestone owner and no active UI; (2) A4/PDF-truth resume preview was in the original audit but dropped from the matrix and milestones entirely; (3) Vault management tool reuse of legacy slate-styled `setup/` panels is unresolved technical/design debt; (4) `/cover-letter-preview` and `/resume-preview` route policy contradicts the forbidden-remount list without explicit resolution; (5) onboarding upload honesty is unresolved and is a live user-trust risk.
- **User-visible outcome:** None. This milestone produces only roadmap edits.
- **Scope:** Update matrix row ownership; classify all gaps; assign milestone owners; strengthen sub-panel safeguard; clarify M4 known gaps; make M5a/M5b/M5c scopes unambiguous.
- **Non-scope:** No application code, no UI changes, no test changes, no component rewrites, no new documents, no route deletion.
- **Required decisions (settled in this milestone):**

  | Decision | Resolution |
  |---|---|
  | **A4 / PDF-truth resume preview** | **Two-mode assigned M5a.** Editing view: current `RenderedResume` formatted HTML is acceptable for bullet switching/editing — no change required. Approve-for-export: after gate passes, show `ResumePdfPreview` (`src/components/resume-drafts/ResumePdfPreview.tsx`) — renders exact Puppeteer HTML in A4-constrained iframe via `renderResumePdfHtml` — in place of or adjacent to the current preview. Component already exists; use it directly. Do not remount `ResumePreviewPageClient`. Server gate remains export truth. |
  | **AI model-tier selector** | **IDs verified stable (2026-06-28).** `gemini-3-flash-preview` / `gemini-3.5-flash` confirmed stable. M4.6 adds runtime guardrail for diagnostic logging on model fallback. M5b exposes simple tier select in the Generate flow (`ModelTierSelect` component exists; `setResumeModelTier`/`setCoverLetterModelTier` never called in active render path — wire in M5b). |
  | **Vault management tools reuse** | **Accepted temporary debt.** `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, `InventoryTextExtractionPanel`, `UploadCard` are mounted wholesale in the Vault PD section — legacy `setup/` components, slate-styled (176 `slate-*` uses), behind a disclosure accordion. They are wired correctly and functional. **Not a blocker for M5a.** Restyle to Folio-native tokens (folio-primary-container, folio-sage-border, rounded-xl, no shadows, sentence case per DESIGN.md) assigned **M5b**. `shadow-md` on Vault FAB buttons is an additional DESIGN.md violation to fix in the same pass. |
  | **`/resume-preview` + `/cover-letter-preview` route policy** | **Grandfathered secondary routes.** Neither is linked from any active Folio navigation component; reachable by direct URL only (no active Folio page links to them). `CoverLetterPreviewPageClient` carries full CL editing M5c will absorb into `/output`; remains mounted through M5c, retire **M7**. `ResumePreviewPageClient` carries structured editing + PDF iframe preview that M5a absorbs into `/output`; remains mounted through M5a, retire **M7**. §10.2 forbidden note should clarify these are grandfathered-secondary, not banned. |
  | **Onboarding upload honesty** | **Interim honesty action required before M7.** `onboarding/page.tsx` `handleFinish` discards the uploaded file silently — the UI implies the resume was parsed and stored, which is false. Interim: hide the upload step or add a visible label "Resume not yet connected — add your career history in Career Vault." Full real upload implementation remains M7. This is a user-trust issue, not cosmetic. |
  | **Source-resume / parsed-debug audit** | **Parked** — M7 / v0.10.0. No milestone owns it. Low user-facing risk; purely diagnostic. |
  | **Model ID stability (C6)** | **Investigate Now** before M5b model-tier UI. Record findings in the M5b opening prompt. Not a blocker for M5a or for starting M5b. |
  | **CL export gate verification** | Assigned **M5c**. Confirm 420-word + banned-phrase gate fires on the Folio export path. Buttons exist but gate enforcement in the Folio path is unverified. |

- **Decisions that block M5a:** **M4.6 must land before M5a begins** — CL gate bug, AI step cost gap, onboarding label, model guardrail. All other unresolved issues are M5b, M5c, or M7 scope.
- **DoD:** Every matrix row has a milestone owner or explicit park decision; A4 preview is assigned M5a; model-tier selector is assigned M5b; legacy sub-panel reuse is logged in §6 with restyle target M5b; M4 completion notes the A4 gap; M5a/M5b/M5c scopes are unambiguous; M5a opening prompt includes A4 preview.
- **Handoff:** Proceed to M4.6 immediately. M4.6 must complete before M5a begins.
- **Dependencies:** M4.

---

### M4.6 — Pre-M5a Bug Fixes + M3 Gap Closure

- **Objective:** Close two live issues and one confirmed M3 gap before M5a begins.
- **Outcome:** (1) CL export gate enforced in Folio path: `OutputEditorPageClient` download buttons gated on `overLimit || bannedPhrases.length > 0`, matching `CoverLetterPreviewPageClient`'s existing gate — import `detectBannedPhrases`, compute banned phrases, show error message, disable buttons. (2) AI step cost estimate visible in the Generate flow — confirmed missing from active Folio path (M3 gap); add a "1–2 AI steps" estimate or equivalent label near the Generate CTA in `GenerateTailoredResumeSection` or `NewApplicationPageClient`. (3) Onboarding upload subtitle honesty: `STEP_SUBS[1]` currently reads "Upload your existing resume and we'll parse it into your career vault" — replace with honest text that does not promise parsing (`handleFinish` never processes the file). (4) Model tier guardrail: add runtime diagnostic logging to model-tier read/write path so model ID failures surface clearly before M5b tier UI.
- **Stays mounted:** `OutputEditorPageClient`, `NewApplicationPageClient` (or embedded `GenerateTailoredResumeSection`), `onboarding/page.tsx`.
- **References:** `CoverLetterPreviewPageClient` (behavioral reference for CL gate logic — do not remount).
- **Must not change:** gate logic in `CoverLetterPreviewPageClient`, generation engine, export engine, page-count truth.
- **Tests:** verify at-limit and banned-phrase CL blocks download in `OutputEditorPageClient`.
- **DoD:** (1) over-limit or banned-phrase CL cannot be downloaded from `/output`; (2) AI step cost estimate visible before Generate CTA; (3) onboarding upload step does not claim to parse the file; (4) model fallback is logged diagnostically.
- **Dependencies:** M4.

---

### M5a — Output: Structured Edit + Revision Queue + PDF-on-Approve Preview

- **Objective:** Editing depth after core trust proven; PDF preview after Approve.
- **Outcome:** (1) Structured section/header edit with dirty/beforeunload + re-approval invalidation. (2) Resume revision queue (batch scoped, Accept all / Reject all). (3) PDF-on-approve preview [M4.5+, two-mode]: editing view stays as current `RenderedResume` formatted HTML (acceptable for bullet switching/editing — no replacement); after Approve for Export gate passes, show `ResumePdfPreview` (`src/components/resume-drafts/ResumePdfPreview.tsx`) — renders exact Puppeteer HTML in A4-constrained iframe — in place of or adjacent to the current preview panel. Do NOT remount `ResumePreviewPageClient`.
- **Stays mounted:** `OutputEditorPageClient`.
- **References:** `ResumeDraftReviewWorkspace` (`packageMode`), `ResumeStagedCustomRevisionPanel`, `ResumePdfPreview` (use directly for post-approve view — reusable component, not a page client).
- **Must not change:** staging never calls AI; no page-load AI.
- **Tests:** extend `resume-draft-review`, `forced-bullet-regeneration`.
- **Dependencies:** M4, M4.6.

---

### M5b — Output: Evidence Controls + Tailoring Diagnostics + Fit Summary + Model-Tier

- **Objective:** Restore PD depth for evidence tailoring; resolve model-tier selector (IDs verified stable).
- **Outcome:** (1) Exclude/force/rewrite/regenerate **line-level** pending queue wired (not whole-job — whole-job toggles are the M4-era stand-in; line-level is this milestone's job); tailoring diagnostics panel reading saved spine snapshot (no page-load AI); fit summary from saved rationale. (2) Model-tier selector: IDs verified stable (C6, 2026-06-28); expose simple tier select in Generate flow (`ModelTierSelect` component exists — wire `setResumeModelTier`/`setCoverLetterModelTier` in active render path); runtime guardrail already added in M4.6. Vault panel restyle deferred to MX (optional — accepted debt since M2).
- **Stays mounted:** `OutputEditorPageClient`.
- **References:** `ResumeEvidenceRegenerationPanel`, `PackageTailoringDiagnosticsPanel`, `PackageFitSummaryPanel`, `ModelTierSelect` (Generate integration).
- **Must not change:** no page-load AI for diagnostics; staging never auto-saves.
- **Tests:** extend `application-package-ux`, `forced-bullet-regeneration`.
- **Dependencies:** M5a.

---

### M5c — Cover-Letter Editing, Evidence Staging, Export Gates

- **Objective:** CL trust closure.
- **Outcome:** Manual CL edit + dirty/save/beforeunload; pending-only evidence staging applied on regenerate only; export gates (420-word + banned-phrase) **verified and enforced** on the Folio `/output` export path (buttons exist but gate unverified [M4.5]); secondary formats under PD.
- **Stays mounted:** `OutputEditorPageClient` (CL tab). `/cover-letter-preview` is a grandfathered secondary route [M4.5] — still mounted and navigable by direct URL through M5c; absorb its editing into `/output` during this milestone, then mark for retirement in M7.
- **References:** `CoverLetterPreviewPageClient` (behavioral reference only — absorb its behavior, do not remount), `CoverLetterEvidenceRegenerationPanel`, `CoverLetterStagedRevisionPanel`.
- **Tests:** extend `cover-letter`, `cover-letter-application-package`.
- **Dependencies:** M4.

---

### M6 — Applications Parity

- **Objective:** Close `D1` without remounting.
- **Outcome:** Status edit, notes, artifact links; archive verify; saved-job + draft-history under PD.
- **Stays mounted:** `ApplicationsPageClient`.
- **References:** `RecordsPageClient`, `ApplicationRecordsPanel`, `DraftHistoryPanel`, `bc2fb9f` panel behavior.
- **Must not change:** archive-without-delete semantics.
- **Tests:** extend `application-records`; route-contract for `/records`.
- **Dependencies:** M1.

---

### M7 — Secondary Surfaces & Stub Cleanup

- **Outcome:** Onboarding upload made real or hidden with honest labeling (`D3` — **user-trust issue, not cosmetic**; interim label/hide may land earlier as a no-code fix); interview filter removed or status added (`S2`); settings minimal-real or hidden (`S1`); landing signed-in redirect (`D6`); dead buttons wired/removed; retire `/resume-preview` and `/cover-letter-preview` routes after M5a and M5c absorb their behavior into `/output`; source-resume/parsed-debug audit implemented or explicitly dropped (parked since M4.5).
- **Dependencies:** M2, M6.

---

### M8 — Authenticated E2E Closure

- **Objective:** Prove minimum parity contract holds end-to-end.
- **Flow:** sign in → upload → parse → inspect Vault → save job → research → generate → review → edit → approve → export → Applications reload.
- **Includes:** direct route reloads, partial AI failures, save failures, identity changes, desktop/mobile, existing persisted user data.
- **Human-led; Claude assists from explicit observations and screenshots.**
- **DoD:** all five parity contract clauses pass with authenticated data.
- **Dependencies:** M5a, M5b, M5c, M6, M7.

---

### M9 — E2E Fix Batch

- **Objective:** Close the cross-page issues surfaced in the M8 E2E check. All changes are low-risk display/layout fixes; no backend, schema, or engine changes.
- **Outcome:**
  1. **Dashboard:** remove the duplicate "+" icon from the page body (keep the sidebar CTA only).
  2. **Applications — status summary strip:** add a count-by-status summary above the table, derived from loaded records in local state — no new API call.
  3. **Applications — "Resume Generated" display label:** rename display label to "Ready" everywhere it appears in the Applications UI. **Do NOT rename the underlying `resume_generated` status value** — that requires a DB migration and is out of scope; flag as a future schema task if needed.
  4. **Applications — status column truncation:** fix CSS so the status badge does not truncate.
  5. **Applications — Artifacts column:** split into two explicit columns — "Resume" (✓/—) and "Cover Letter" (✓/—) — replacing the combined `formatApplicationArtifactSummary` display.
  6. **Career Vault — capital V:** sweep all visible copy in the app for "career vault" and ensure it reads "Career Vault" consistently.
  7. **Career Vault — Add-from-Text position:** move the "Add Experience from text" panel / disclosure to appear directly below the vault summary, above the collated tabs (currently at the bottom).
  8. **Career Vault — Keyword Bank:** promote Keyword Bank from the VMT section to the main Career Vault panel (as a persistent section, not buried in maintenance tools).
  9. **Profile icons:** audit all avatar/profile icon surfaces across the app (TopBar was fixed in M7 — check Dashboard, sidebar, any other locations); wire all remaining ones to `/profile`.
- **Stays mounted:** all five active Folio route clients unchanged.
- **Must not change:** generation engine, export engine, evidence spine, model IDs, approval/export gate semantics, database schema, `resume_generated` status value.
- **Tests:** no new suites needed; confirm `application-records.test.ts` (55/55) still green after label change.
- **Model:** Sonnet. **Effort:** Low.
- **Dependencies:** M8.

---

### MX — Career Vault Overhaul

- **Objective:** Close the visual and structural debt in Career Vault that has been accepted since M2. Scope expanded from restyle-only to include layout reorganization and porting missing features from the legacy upload page.
- **Outcome:**
  1. **Restyle VMT panels:** `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, `InventoryTextExtractionPanel`, `UploadCard` restyled to Folio-native tokens (`folio-primary-container`, `folio-sage-border`, `rounded-xl`/`rounded-lg`, sentence case, no shadows per DESIGN.md). `shadow-md` on Vault FAB buttons fixed.
  2. **Port Inventory Summary:** bring the upload summary box from the legacy upload page into the Career Vault main panel (above the upload CTA) — show parsed bullet counts, upload date, parse quality. Source: legacy `UploadCard` / inventory stats.
  3. **Uploaded Resumes list:** add an "Uploaded resumes" list to the VMT section sourced from `stored_files` / `original-resume-files` — lets users see what raw files they have uploaded.
  4. **Reorganize VMT:** rename section to "Vault maintenance" (sentence case); order: Enrichment Review → Duplicate Cleanup → Project Cleanup → Uploaded Resumes. Keyword Bank was promoted to main UI in M9 — remove it from here.
  5. **Capitalize VMT items:** ensure all section headings and labels inside VMT use proper sentence case per DESIGN.md.
- **Stays mounted:** `CareerVaultPageClient` (restyle + reorganization — client, wiring, and data contracts unchanged).
- **References:** `setup/` panel components (restyle targets); legacy `UploadCard` + `stored_files` queries for Inventory Summary and Uploaded Resumes list.
- **Must not change:** Vault data wiring, evidence semantics, panel interaction logic, upload/parse engine.
- **Tests:** no new suites; verify panels render without `shadow-*`/`slate-*` tokens; verify Inventory Summary shows real data.
- **Model:** Sonnet. **Effort:** Medium.
- **Dependencies:** M9.

---

### M10a — Output Editor Redesign: Design Session

- **Objective:** Produce a written, agreed layout proposal for the Output Editor redesign before any implementation code is written. This session produces a design document only — no application code changes.
- **Why this exists:** M4–M5 correctly decomposed the legacy Output Editor capabilities but stacked them as collapsed disclosures rather than designing a coherent interaction layout. The resulting UX does not make sense as a whole. The redesign must be decided architecturally before implementation to avoid another round of capability-stacking.
- **Topics the design session must settle:**
  1. **Fit summary placement:** AI fit summary with score should appear prominently at the top of the Resume tab after generation — not buried in a right-panel disclosure.
  2. **Dual-view toggle:** after generation, two views — Folio-themed text view (default) and PDF view. Define the toggle mechanic and where each view lives.
  3. **Selectable bullet blocks:** in the text view, each bullet should be a selectable block with per-bullet actions (remove, edit, replace). Define how this interacts with the existing evidence controls and re-approval invalidation.
  4. **Layout controls + live PDF view:** audit the legacy resume editor for layout controls (font size, spacing, margins); propose how these fit in the Folio layout alongside the live PDF view.
  5. **Export UX consolidation:** two separate Export PDF / Export DOCX boxes currently exist — propose a single consolidated export card that replaces both.
  6. **"Mark as sent" clarification:** determine what this actually does (sets application status to `applied`) and whether to surface it more clearly, move it, or remove it.
  7. **Right panel reorganization:** decide what stays in the right panel (revision queue, evidence controls, diagnostics) vs what moves to the main left panel or a new layout zone.
  8. **CL secondary formats:** Email, LinkedIn, Recruiter, WhatsApp intro formats are missing from the CL tab — decide placement and interaction model.
- **Output:** a written layout proposal in `docs/OUTPUT_EDITOR_DESIGN.md` (or equivalent), agreed by the user before M10b begins.
- **Non-scope:** no application code, no component changes, no test changes.
- **Model:** Opus. **Effort:** Medium.
- **Dependencies:** M9, MX.

---

### M10b — Output Editor Redesign: Implementation

- **Objective:** Implement the Output Editor layout and interaction design agreed in M10a.
- **Outcome:** (defined by M10a design session — implement exactly what was agreed, nothing more)
- **Stays mounted:** `OutputEditorPageClient`.
- **Must not change:** export engine, page-count truth, filename scheme, generation engine, model IDs, evidence spine, approval/export gate semantics.
- **Independent review:** required before merge (same standard as M4).
- **Model:** Opus. **Effort:** High.
- **Dependencies:** M10a.

---

## 10. Safeguards Against Another Legacy-UI Restoration

1. **Route-contract tests (land in M1):** assert each active route renders its Folio client. A source-grep contract in `app-shell.test.ts` is the model.
2. **Forbidden-remount rule (document in `FOLIO_REDESIGN.md`):** `InventoryPageClient`, `RecordsPageClient`, `GeneratePageClient` must not be imported by any `page.tsx`. `ResumePreviewPageClient` and `CoverLetterPreviewPageClient` are **grandfathered secondary routes** [M4.5] — they remain mounted at their own `/resume-preview` and `/cover-letter-preview` routes (not at active workspace routes) and are scheduled for retirement in M7. The test correctly excludes them from the active-route forbidden check.
3. **Capability-level behavior tests** for each restored slice (extraction≠save, one-page gate blocks, approval invalidation, partial-failure preserves resume).
4. **Milestone stop rule:** each milestone names one Folio client that stays mounted; if a plan proposes swapping a route or importing a legacy client, stop and re-scope.
5. **Independent Opus review before merge** for M4, M5b; review brief + diff only; no implementation history.
6. **Screenshot + responsive QA** and **authenticated direct-reload testing** for every UI milestone.
7. **Source-of-truth/persistence tests** retained (`draft-inventory-safety` is the model).
8. **Documentation separates behavior from presentation:** `FOLIO_REDESIGN.md` owns presentation/routes; `HANDOFF.md`/`KNOWN_ISSUES.md` own behavior.
9. **Legacy sub-panel reuse requires explicit approval and logging [M4.5].** Mounting a legacy `setup/` component verbatim inside an active Folio route counts as wholesale legacy reuse unless logged as accepted debt in §6 and the Milestone Completion Log. Hiding legacy UI behind a disclosure accordion is not automatically compliant. Accepted debt must record: components involved; reason accepted; owner milestone for restyle/decomposition; whether it blocks the next milestone. Current logged debt: `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, `InventoryTextExtractionPanel`, `UploadCard` — Vault PD panels [M2]; restyle deferred to MX (optional, after M8); does not block M5a–M8.

---

## 11. Model & Effort by Stage

| Stage | Model | Effort | Reasoning |
|---|---|---|---|
| Product/capability planning and cross-cutting architecture decisions | Opus | High | Requires full context across all three systems; wrong decisions cascade across milestones |
| M1 — Foundation lock, route-contract safeguards, backend ports | Opus | Medium | Small line count but crosses schema (CL response constraint), persistence (load-failure trust), and the safeguard harness simultaneously; high consequence per line |
| M2 — Career Vault minimum parity | Sonnet | Medium | Bounded page work; persistence touches `InventoryEdits` and `resume_inventories`; real UI complexity in edit/restore/extract flows |
| M3 — Generate minimum parity | Sonnet | Medium | Mostly verification + small surface adds; orchestration state touches generation engine |
| M4 — Output core delivery | Opus | High | Crosses approval + export + server gate + persistence trust; highest data-integrity risk in the milestone set; independent review required |
| M4.5 — Post-M4 matrix reconciliation | Sonnet | Low | Docs only; no code; reconcile matrix gaps, assign owners, settle decisions before M5a |
| M4.6 — Pre-M5a bug fixes + M3 gap closure | Sonnet | Low | CL gate fix (~20 lines), AI step cost label, onboarding text change, model guardrail |
| M5a — Output: structured edit + revision queue + PDF-on-approve preview | Sonnet | Medium | Well-understood pattern (dirty state, beforeunload, staged accept/reject); post-approve `ResumePdfPreview` add is straightforward; re-approval invalidation is the sensitive path |
| M5b — Output: evidence controls + diagnostics + fit summary + model-tier | Sonnet | High | Complex pending-queue semantics (line-level, not whole-job); PD surface decisions; diagnostic reads from spine; model-tier wiring (IDs stable); must not introduce page-load AI |
| M5c — Cover-letter editing, evidence staging, export gates | Sonnet | Medium | CL gate + pending-only staging are well-specified; primary work is UI mapping and gate wiring |
| M6 — Applications parity | Sonnet | Low | Re-implementing status/notes/artifact links inside existing `ApplicationsPageClient`; no schema changes |
| M7 — Secondary surfaces & stub cleanup | Sonnet | Low | Mechanical: remove stubs, wire real flows, add redirect |
| M8 — Authenticated E2E closure | Sonnet (assist) | Low | Human-led; Claude assists from observations and screenshots only |
| Independent milestone review (M4, M5b, M10b) | Opus (fresh session) | Low | Review brief + diff only; fresh context; no implementation history |
| M9 — E2E fix batch | Sonnet | Low | Cross-page display/layout fixes; no backend or schema changes |
| MX — Career Vault overhaul | Sonnet | Medium | Restyle + layout reorganization + feature ports; wiring and data contracts unchanged |
| M10a — Output Editor redesign: design session | Opus | Medium | UX architecture decisions; wrong choices cascade; no code produced |
| M10b — Output Editor redesign: implementation | Opus | High | Highest-complexity redesign; selectable bullets + layout controls + export UX consolidation; independent review required |

---

## 12. Risk Register

### Act Now

- No route-contract test exists → another one-line swap could recur silently. (M1)
- Output Editor ships exports without the server one-page gate visible → users can believe a multi-page resume is export-ready. (M4)
- Onboarding upload is decorative (`D3`) → user believes their resume loaded. Flag in docs immediately; fix in M7.
- **CL export gate NOT enforced in Folio Output path (M4.6):** `detectBannedPhrases` not imported in `OutputEditorPageClient`; download buttons gated only on `isBusy || !body.trim()`; `overLimit` shown as red text only. Fix before M5a.

### Investigate Now

- `profiles` migration applied to the live Supabase project? (runtime, not repo)
- ~~Model-tier IDs stability (C6)~~ — **verified stable (2026-06-28)**; runtime guardrail added in M4.6 before M5b UI.
- `BulletEnrichmentSuggestion.issueTitle` / vault app-count linkage runtime shape (`U1`).
- Does `56bc7c5` apply cleanly on the Folio tip (check `call-gemini.ts` current shape)?
- Generate→Output: confirm no lingering `/resume-preview` navigation in any Folio path.

### Park for Later

- Full Inventory CRUD (v0.10.0); CL version history/learning log; kanban/apply tracking; cover-letter-only mode; additional search providers; auto-shrink for overflow; secondary outreach polish.

### Ignore / Accept Risk

- Underfilled one-page PDFs not flagged; OS font boundary disagreements (server count is truth); paraphrase duplicates without shared metrics; em-dash prompt-only enforcement; TopBar decorative until a real notifications system exists.

---

## 13. Chat Prompts

### M1 Opening Prompt (current — use this to start the M1 implementation chat)

```
Implement Milestone M1 — Foundation Lock, Route-Contract Safeguards, and Safe Backend Ports — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery (already created from folio-claude-stable 7aec1d0). Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient.

PROTOCOL: Ask me clarifying questions before writing any code. State what you plan to do and wait for my confirmation.

SCOPE (only this, nothing else):
1. Cherry-pick two Codex commits onto folio-recovery and confirm they apply cleanly:
   - 56bc7c5 (schema-constrained Gemini cover-letter output: responseSchema + buildGeminiGenerationConfig + COVER_LETTER_RESPONSE_SCHEMA)
   - 0877eb2 (Output cover-letter tab: a failed persisted lookup must NOT create a draft; show error + retry)
   Keep their tests. Re-run cover-letter + gemini-retry + generation-partial-failure suites.

2. Add route-contract tests (extend tests/suites/app-shell.test.ts):
   - /dashboard → DashboardPageClient
   - /inventory → CareerVaultPageClient
   - /generate → NewApplicationPageClient
   - /records → ApplicationsPageClient
   - /output/[draftId] → OutputEditorPageClient
   - Forbidden-remount check: no app/(workspace)/*/page.tsx imports any of the five legacy clients.

3. Verify (do not rebuild) auth foundation: sign-out in AppNav, signup→/auth/confirm-email, and profiles migration (supabase/migrations/20240001_profiles.sql). Report runtime gaps; do not change behavior.

4. Document the forbidden-remount rule in docs/FOLIO_REDESIGN.md.

MUST NOT CHANGE: route→client mounts, generation/export semantics, approval/export gates, model IDs, Supabase schema.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only (docs/TESTING.md). Update docs under /docs only.

After completing M1, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M1 complete in the Milestone Completion Log.
- Write the M2 opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M2 Opening Prompt (current — use this to start the M2 implementation chat)

```
Implement Milestone M2 — Career Vault Minimum Parity — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1 is complete (route-contract safeguards landed; two safe Codex commits ported; auth verified). Read the M1 Milestone Completion Log row and §9 "M2 — Career Vault Minimum Parity".

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. CareerVaultPageClient stays mounted at /inventory. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is documented in docs/FOLIO_REDESIGN.md and enforced by tests/suites/app-shell.test.ts — keep it green.

PROTOCOL: Ask me clarifying questions before writing any code. State what you plan to do and wait for my confirmation.

SCOPE (only this, nothing else):
1. Trustworthy DOCX upload/parse in the Career Vault dialog: explicit partial / failed / saved states (no silent bad parse). Source resumes are NEVER mutated.
2. Overlay edit / hide / restore fully wired (non-destructive; overlay edits live in InventoryEdits — never touch source resumes).
3. Add-from-Text: enforce extract → review → apply. Extraction alone must NEVER save. Project-like evidence must NOT silently enter Work Experience.
4. Bring selected cleanup tools under progressive disclosure (PD), decomposing behavior from the legacy references — do NOT mount legacy clients:
   - Enrichment review (reference: EnrichmentReviewPanel)
   - Duplicate cleanup (reference: InventoryDuplicateCleanupPanel)
   - Project-pollution cleanup (reference: InventoryProjectCleanupPanel)

REFERENCES (read only — behavioral reference, never mount): InventoryPageClient, InventoryEditPanel, InventoryTextExtractionPanel, and the d71d353 WorkspaceProvider state additions.

BACKEND/DEPS: resume_inventories, stored_files, original-resume-files, InventoryEdits, parseDocxResume() (client-side). No schema changes.

MUST NOT CHANGE: source resumes never mutated; evidence spine / generation payload; route→client mounts; model IDs; Supabase schema.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only — extend inventory-edits, inventory-text-extraction, draft-inventory-safety, and the /inventory route-contract check in app-shell.test.ts (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails, generation-semantics area) and 2 lint errors in ProfilePageClient.tsx. Report if they block your verification but do not expand scope into them.

After completing M2, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M2 complete in the Milestone Completion Log.
- Write the M3 opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M3 Opening Prompt

```
Implement Milestone M3 — Generate Minimum Parity — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1 and M2 are complete. Read the M2 Milestone Completion Log row and §9 "M3 — Generate Minimum Parity".

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. NewApplicationPageClient stays mounted at /generate. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

PROTOCOL: Ask me clarifying questions before writing any code. State what you plan to do and wait for my confirmation.

SCOPE (only this, nothing else):
1. Saved-job save/reuse: when a JD is submitted, save it to job_descriptions and surface any existing saved job for this company+role for reuse (avoid duplicate generate calls for the same job).
2. Visible context policy: before the Generate CTA, show the user which context mode will be used (JD-only vs website+JD vs confidential) and why — no silent research decisions.
3. Partial-failure recovery: if the cover letter generation step fails after the resume succeeds, the resume draft must be preserved and the user must be offered a CL-only retry path. The resume must never be lost on a CL failure.

STAYS MOUNTED: NewApplicationPageClient + embedded GenerateTailoredResumeSection.

REFERENCES (read only — behavioral reference, never mount): GeneratePageClient, and the generate-flow, generation-partial-failure test suites for behavioral contracts.

BACKEND/DEPS: job_descriptions, application_records, draft tables, company-context engine. No schema changes.

MUST NOT CHANGE: context-policy semantics, cost estimates, generation engine, model IDs, evidence spine / generation payload.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only — extend generate-flow and generation-partial-failure (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails, generation-semantics area); draft-inventory-safety.test.ts (2 fails, updateGeneratedResumeDraftInCloud / deleteGeneratedResumeDraftFromCloud); 2 lint errors in untouched files (NewApplicationPageClient.tsx, ProfilePageClient.tsx). Report if they block your verification but do not expand scope.

After completing M3, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M3 complete in the Milestone Completion Log.
- Write the M4 opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M4 Opening Prompt

```
Implement Milestone M4 — Output Core Delivery — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1, M2, and M3 are complete. Read the M3 Milestone Completion Log row and §9 "M4 — Output Core Delivery".

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. OutputEditorPageClient stays mounted at /output/[draftId]. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow the Folio design system defined in docs/DESIGN.md. Read it before building any component. Key rules: Inter font, sentence case everywhere, no shadows (depth via hairline borders and tonal surfaces), rounded-xl for cards (12px), rounded-lg for controls (8px), folio-primary-container (#2A7A5E) for primary actions, folio-sage-border for card borders, folio-surface-container-low for tinted notice surfaces.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Approve-for-export sequence: explicit two-step Approve → Export flow in OutputEditorPageClient; Approve calls /api/approve/resume-draft; approval state is explicit and persisted.
2. Server one-page PDF hard gate (422): /api/validate/resume-pdf blocks export when resume overflows one page; UI must surface the block with actionable copy (not silent failure).
3. PDF/DOCX export with structured filenames + private storage delivery: wire to /api/export/resume-pdf and /api/export/resume-docx; filenames follow the existing structured naming scheme.
4. needs_review repair banner: when draft status is needs_review, show a visible banner with repair action before the approve CTA.
5. Post-approval edit invalidation: structured edits after approval must downgrade the approval state (layout_changed).
6. Failed-load vs confirmed-missing honesty: a failed persisted load must never be treated as "no draft exists."

STAYS MOUNTED: OutputEditorPageClient.

REFERENCES (read only — behavioral reference, never mount): ResumePreviewPageClient, ApplicationReviewCenter, ExportFitStatusPanel.

BACKEND/DEPS: /api/approve/resume-draft, /api/validate/resume-pdf, /api/export/resume-*, generated-documents, application_records.

MUST NOT CHANGE: export engine, page-count truth, filename scheme, generation engine, model IDs, evidence spine.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only — extend resume-approve-validation, resume-pdf-page-count, resume-export-delivery, application-package-ux (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails, generation-semantics area); draft-inventory-safety.test.ts (2 fails, updateGeneratedResumeDraftInCloud / deleteGeneratedResumeDraftFromCloud); lint error in ProfilePageClient.tsx (1 error, untouched file). Report if they block your verification but do not expand scope.

INDEPENDENT REVIEW: M4 requires an independent Opus review before merge. After implementation and verification, open a fresh chat with the Opus review brief + diff only — no implementation history.

After completing M4, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M4 complete in the Milestone Completion Log.
- Write the M5a opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M4.6 Opening Prompt

```
Implement Milestone M4.6 — Pre-M5a Bug Fixes + M3 Gap Closure — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M4 and M4.5 (roadmap reconciliation) are complete. Read the M4 and M4.5 Milestone Completion Log rows and §9 "M4.6 — Pre-M5a Bug Fixes + M3 Gap Closure".

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. All five active route clients stay mounted. Never swap an active route to a legacy page client. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow the Folio design system in docs/DESIGN.md. Sentence case; no shadows; folio-* tokens.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. CL export gate in OutputEditorPageClient: the download buttons (DownloadCoverLetterPdfButton, DownloadCoverLetterDocxButton) are currently gated only on `isBusy || !body.trim()`. The gate must match CoverLetterPreviewPageClient's logic — import detectBannedPhrases from @/lib/cover-letter/banned-phrases, compute bannedPhrases, disable both buttons when `overLimit || bannedPhrases.length > 0`, and show a visible error/warning message explaining why export is blocked. Do NOT modify CoverLetterPreviewPageClient.

2. AI step cost estimate in the Generate flow: confirmed missing from the active Folio path (GenerateTailoredResumeSection / NewApplicationPageClient). Add a visible "1–2 AI steps" estimate or equivalent label near the Generate CTA so the user knows the AI cost before triggering generation. Keep it simple — a static label or inline copy is sufficient; do not add a new API call or dynamic computation.

3. Onboarding upload subtitle honesty: src/app/onboarding/page.tsx STEP_SUBS[1] currently reads "Upload your existing resume and we'll parse it into your career vault." — this is false (handleFinish upserts profiles only; the file is never processed). Replace with honest text that does not promise parsing. Example: "Upload your resume — you can add it to your career vault after setup." Keep the upload UI as-is; only the subtitle text changes.

4. Model tier diagnostic guardrail: add runtime logging (console.warn or equivalent) in the model-tier read path (src/lib/ai/model-tier-storage.ts or call-gemini.ts) so that if the model ID fails or falls back, the failure surface is clearly logged with the attempted model ID. IDs are confirmed stable — this is a defensive diagnostic only, not a behavior change.

STAYS MOUNTED: OutputEditorPageClient, NewApplicationPageClient (or embedded GenerateTailoredResumeSection), onboarding/page.tsx.

REFERENCES (behavioral reference, do not remount): CoverLetterPreviewPageClient (gate logic reference for item 1 only).

MUST NOT CHANGE: generation engine, export engine, page-count truth, approval/export gate semantics, model IDs, Supabase schema, CoverLetterPreviewPageClient behavior.

CHECKS: npm run test, npm run lint, npm run build. No new test suites needed; verify CL gate blocks in OutputEditorPageClient. Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails); draft-inventory-safety.test.ts (2 fails); 1 lint error in ProfilePageClient.tsx. Report if they block your verification but do not expand scope.

After completing M4.6, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M4.6 complete in the Milestone Completion Log.
- Write the M5a opening prompt into the Chat Prompts section (it already exists as a draft — update it if needed after seeing what changed).

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M5a Opening Prompt

```
Implement Milestone M5a — Output: Structured Edit + Revision Queue + A4 Preview — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M4, M4.5 (roadmap reconciliation), and M4.6 (pre-M5a bug fixes) are complete. Read the M4, M4.5, and M4.6 Milestone Completion Log rows and §9 "M5a — Output: Structured Edit + Revision Queue + PDF-on-Approve Preview".

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. OutputEditorPageClient stays mounted at /output/[draftId]. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow the Folio design system in docs/DESIGN.md. Read it before building any component. Sentence case everywhere; no shadows (depth via hairline borders + tonal surfaces); rounded-xl cards (12px), rounded-lg controls (8px); folio-primary-container for primary actions; folio-sage-border for card borders; warning/notice tints already used in OutputEditorPageClient.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Structured section/header editing in OutputEditorPageClient: editable header/contact, summary, experience roles/bullets, education, skills, additional experience — persisted via the existing draft update helper. No new AI on edit; no page-load AI.
2. Dirty-state + beforeunload guard while structured edits are unsaved.
3. Re-approval invalidation on structured edit: saving a structured edit after approval must downgrade approval to layout_changed (clear serverPdfValidation), exactly as the M4 Approve→Export card already consumes (exportReady / layoutChangedAfterApproval). M4 wired invalidation to Regenerate only; M5a extends it to structured edits.
4. Resume revision queue: stage multiple scoped custom revision instructions (professional summary + one or more roles), run ONE batch Gemini call via the existing POST /api/ai/revise-resume-scope queue mode; preview all proposed changes; Accept all persists; Reject all discards. Staging/typing NEVER calls AI.
5. PDF-on-approve preview [M4.5+, two-mode]: the editing view (current RenderedResume formatted HTML) is acceptable for bullet switching/editing and stays unchanged. After Approve for Export gate passes, show ResumePdfPreview (src/components/resume-drafts/ResumePdfPreview.tsx) — renders the exact Puppeteer HTML in a true A4-constrained iframe via renderResumePdfHtml — in place of or adjacent to the current preview panel. Do NOT mount ResumePreviewPageClient.

STAYS MOUNTED: OutputEditorPageClient.

REFERENCES (read only — behavioral reference, never mount): ResumeDraftReviewWorkspace (packageMode), ResumeStagedCustomRevisionPanel, ResumePreviewPageClient's structured editor + markLayoutChangedAfterApproval invalidation path, ResumePdfPreview (use directly for post-approve view — reusable component, not a page client).

BACKEND/DEPS: existing draft update helper (updateGeneratedResumeDraftInCloud), POST /api/ai/revise-resume-scope (single-scope + queue batch modes already exist). No schema changes. No new endpoints.

MUST NOT CHANGE: export engine, page-count truth, filename scheme, generation engine, model IDs, evidence spine; the M4 approval/export gate semantics (Approve→Export, 422 block, exportReady derivation) must keep working unchanged.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only — extend resume-draft-review and forced-bullet-regeneration (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails, generation-semantics area); draft-inventory-safety.test.ts (2 fails, updateGeneratedResumeDraftInCloud / deleteGeneratedResumeDraftFromCloud); 1 lint error in ProfilePageClient.tsx (untouched file). Report if they block your verification but do not expand scope.

After completing M5a, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M5a complete in the Milestone Completion Log.
- Write the M5b opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M5b Opening Prompt

```
Implement Milestone M5b — Output: Evidence Controls + Tailoring Diagnostics + Fit Summary + Model-Tier — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M5a are complete. Read the M5a Milestone Completion Log row and §9 "M5b — Output: Evidence Controls + Tailoring Diagnostics + Fit Summary + Model-Tier".

WHAT IS COMPLETE (do not redo):
- M5a: structured editor (all sections, add/remove/edit within existing roles), dirty/beforeunload, re-approval invalidation on both save paths, Folio-native revision queue (collapsed disclosure, right column, batch Gemini, Accept/Reject, model tier select), PDF-on-approve two-mode preview (RenderedResume → ResumePdfPreview after exportReady).
- M4: Approve→Export card, server one-page gate, needs_review banner, load-failure honesty, experience toggles (whole-job).
- M4.6: CL export gate, AI step estimate, onboarding honesty, model-tier guardrail (console.warn on fallback).

SCOPE (M5b only — do not implement M5c or later):
1. **Line-level evidence controls** in `OutputEditorPageClient`: exclude individual bullets (not whole-job — whole-job exists already), force individual bullets, and rewrite/regenerate a single bullet. These feed into `regenerationControls` at next Regenerate (not live AI on toggle). Behavioral reference: `ResumeEvidenceRegenerationPanel` (do not mount it — decompose into Folio-native UI within the right column or below the left panel).
2. **Tailoring diagnostics** in `OutputEditorPageClient`: show selected evidence, omitted evidence, and proof/warnings from the existing `rationale` and `inputSnapshot` on the draft. Read-only display — no AI call. Behavioral reference: `PackageTailoringDiagnosticsPanel`.
3. **Fit summary** in `OutputEditorPageClient`: surface the existing `rationale.fitSummary` (or equivalent) and JD alignment signals from bullet metadata. Read-only display. Behavioral reference: `PackageFitSummaryPanel`.
4. **Model-tier selector in the Generate flow** (`NewApplicationPageClient`): wire `setResumeModelTier` and `setCoverLetterModelTier` so the user can pick standard/enhanced/premium before generating. The `ModelTierSelect` component exists (`src/components/resume-drafts/ModelTierSelect.tsx`) and the storage helpers are wired (`resolveResumeModelTierForDraft`, `writeStoredResumeModelTier`). IDs are verified stable (2026-06-28). Wire the selector into the Generate form UI.

NON-NEGOTIABLE:
- `OutputEditorPageClient` stays mounted at `/output/[draftId]` — never swap to a legacy page client.
- No active `page.tsx` may import `InventoryPageClient`, `RecordsPageClient`, `GeneratePageClient`, `ResumePreviewPageClient`, or `CoverLetterPreviewPageClient`. `tests/suites/app-shell.test.ts` route-contract test must stay green.
- All UI follows `docs/DESIGN.md` (sentence case, no shadows, folio tokens, rounded-xl cards, rounded-lg controls).
- No schema changes, no new endpoints, no new dependencies.
- Must not change: export engine, page-count truth, filename scheme, generation engine, model IDs, evidence spine, M4/M5a approval/export gate semantics.

REFERENCES:
- `src/components/pages/OutputEditorPageClient.tsx` — primary file to extend.
- `src/components/pages/NewApplicationPageClient.tsx` — add model-tier selector here.
- `src/components/resume-drafts/ModelTierSelect.tsx` — existing component to wire in.
- `ResumeEvidenceRegenerationPanel`, `PackageTailoringDiagnosticsPanel`, `PackageFitSummaryPanel` — behavioral references only; do not mount.
- `src/lib/resume-draft/build-export-document-model.ts`, `src/lib/resume-draft/apply-evidence-changes.ts` — existing evidence helpers.
- `src/lib/ai/model-tier-storage.ts` — `resolveResumeModelTierForDraft`, `writeStoredResumeModelTier`.

MUST NOT CHANGE: export engine, page-count truth, filename scheme, generation engine, evidence spine, M4/M5a approval gate semantics.

CHECKS to run after implementation:
- `npx tsx tests/suites/app-shell.test.ts` — must stay green.
- `npx tsx tests/suites/resume-draft-review.test.ts` — must stay green.
- `npx tsc --noEmit` — no new errors in changed files (pre-existing test-file TS errors are pre-existing debt, not M5b scope).
- Pre-existing red (do not fix): `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`.

After completing M5b, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M5b complete in the Milestone Completion Log.
- Write the M5c opening prompt into the Chat Prompts section.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M5c Opening Prompt

```
Implement Milestone M5c — Cover-Letter Editing, Evidence Staging, Export Gates — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M5b are complete. Read the M5b Milestone Completion Log row and §9 "M5c — Cover-Letter Editing, Evidence Staging, Export Gates".

WHAT IS COMPLETE (do not redo):
- M5b: line-level bullet controls (exclude/force via lineLevelExcludedBulletKeys / lineLevelForcedBulletKeys merged in buildMergedControls), tailoring diagnostics (buildPackageTailoringDiagnostics, read-only, no AI), fit summary (buildPackageFitSummary, read-only, no AI), model-tier selects in Generate embedded mode (Folio-native, uses existing internal state).
- M5a: structured editor, dirty/beforeunload, re-approval invalidation, Folio-native revision queue (right column collapsed disclosure), PDF-on-approve two-mode preview.
- M4: Approve→Export card, server one-page gate, needs_review banner, load-failure honesty, experience toggles (whole-job).
- M4.6: CL export gate (detectBannedPhrases + overLimit gates both download buttons), AI step estimate in embedded mode, onboarding honesty, model-tier guardrail.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. OutputEditorPageClient stays mounted at /output/[draftId]. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow the Folio design system in docs/DESIGN.md. Sentence case; no shadows; folio-* tokens; rounded-xl cards; rounded-lg controls.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Manual cover-letter edit in OutputEditorPageClient (CL tab): editable textarea already exists (body/setBody state). Wire dirty/save/beforeunload: track `clIsDirty` when body differs from the loaded draft; beforeunload guard while dirty; "Save cover letter" button persists via updateGeneratedCoverLetterDraftInCloud; re-approval invalidation not needed for CL edits (CL does not gate PDF export).
2. Pending-only evidence staging applied on CL regeneration only: surface any cover-letter evidence queue items (added via the existing CL evidence UI path) as a staged list; these queue items are applied only when the user clicks "Regenerate cover letter" — never on page load and never auto-saved. No new AI on staging. Behavioral reference: CoverLetterEvidenceRegenerationPanel, CoverLetterStagedRevisionPanel (do not mount them).
3. CL export gates — VERIFY and enforce:
   - The 420-word (FORMAL_COVER_LETTER_MAX_WORDS) gate and banned-phrase gate are computed in CoverLetterTab (overLimit, bannedPhrases, exportBlocked). The CL download buttons are already gated on exportBlocked in OutputEditorPageClient (M4.6 change). VERIFY this actually fires correctly in the live Folio path — confirm the buttons really disable and show the error when over-limit or banned-phrase is present.
   - If the gate is already working correctly after M4.6, note this in the Milestone Completion Log as "verified, no code change needed" and focus on items 1 and 2.
4. Absorb CoverLetterPreviewPageClient editing behavior into the OutputEditorPageClient CL tab: quick-action buttons (Shorten, More formal, More conversational, Warmer, Remove AI phrases) and tone selector are already present in the CL tab. Confirm they are fully functional — no code changes needed if they work. If any quick action is non-functional, wire it.

STAYS MOUNTED: OutputEditorPageClient (CL tab). /cover-letter-preview route (CoverLetterPreviewPageClient) is a grandfathered secondary route [M4.5] — it remains mounted at its own URL through M5c; mark it for retirement in M7 after this milestone absorbs its behavior into /output.

REFERENCES (behavioral reference, do not remount): CoverLetterPreviewPageClient, CoverLetterEvidenceRegenerationPanel, CoverLetterStagedRevisionPanel.

BACKEND/DEPS: updateGeneratedCoverLetterDraftInCloud (already imported in CoverLetterTab); existing CL regeneration route (POST /api/ai/generate-cover-letter already used); no schema changes; no new endpoints.

MUST NOT CHANGE: CL generation engine, export engine, page-count truth, filename scheme, resume generation, model IDs, evidence spine, M4/M5a/M5b approval/export gate semantics (resume side).

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only — extend cover-letter and application-package-ux (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails); draft-inventory-safety.test.ts (2 fails); 1 lint error in ProfilePageClient.tsx. Report if they block your verification but do not expand scope.

After completing M5c, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M5c complete in the Milestone Completion Log.
- Write the M6 opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M6 Opening Prompt

```
Implement Milestone M6 — Applications Parity — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M5c are complete. Read the M5c Milestone Completion Log row and §9 "M6 — Applications Parity".

WHAT IS COMPLETE (do not redo):
- M5c: manual CL edit (clIsEditMode, clIsDirty, beforeunload, Save cover letter, Cancel), pending-only evidence staging (buildEvidenceSpine → buildCoverLetterProofEvidenceList, use/avoid per row, applied on Regenerate only), CL export gates verified (exportBlocked gates download buttons, M4.6 work confirmed), quick-action chips + tone selector verified functional.
- M5b: line-level bullet controls, tailoring diagnostics, fit summary, model-tier selects in Generate.
- M5a: structured editor, dirty/beforeunload, re-approval invalidation, Folio-native revision queue, PDF-on-approve two-mode preview.
- M4: Approve→Export card, server one-page gate, needs_review banner, load-failure honesty, experience toggles (whole-job).
- M4.6: CL export gate, AI step estimate, onboarding honesty, model-tier guardrail.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. ApplicationsPageClient stays mounted at /records. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow the Folio design system in docs/DESIGN.md. Sentence case; no shadows; folio-* tokens; rounded-xl cards; rounded-lg controls.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Status edit: allow inline status change on application records (current statuses: drafting, resume_generated, ready_to_apply, applied, rejected). Persist via the existing update helper. The "Interview" filter stub (hardcoded return []) is pre-existing S2 scope — do NOT add an "interview" status here; that is M7.
2. Notes: allow inline notes edit (free-text) on application records. Persist via the existing update helper.
3. Artifact presence/missing labels + open package/CL links: for each application record, show whether a resume draft and cover letter draft exist; link to /output/[draftId] if the resume draft id is known.
4. Archive verify: confirm that archive (setting status to "archived") works and archived records are hidden from the default list — already implemented, verify only; fix if broken.
5. Saved-job management under PD: surface any saved job descriptions linked to application records in a collapsible disclosure — allow the user to view the saved JD and navigate to /generate to re-use it. No new AI; no schema changes.
6. Unlinked draft history under PD: surface draft records not linked to an application (orphaned drafts) in a collapsible disclosure. No delete/export needed yet — view only.

STAYS MOUNTED: ApplicationsPageClient.

REFERENCES (read only — behavioral reference, never mount): RecordsPageClient, ApplicationRecordsPanel, DraftHistoryPanel, bc2fb9f panel behavior.

BACKEND/DEPS: application_records table, updateApplicationRecordInCloud (or equivalent helper), generated_resume_drafts for artifact presence. No schema changes. No new endpoints.

MUST NOT CHANGE: archive-without-delete semantics, generation engine, export engine, evidence spine, model IDs, M4/M5a/M5b/M5c approval/export gate semantics.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only — extend application-records (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails); draft-inventory-safety.test.ts (2 fails); 1 lint error in ProfilePageClient.tsx. Report if they block your verification but do not expand scope.

After completing M6, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M6 complete in the Milestone Completion Log.
- Write the M7 opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M7 Opening Prompt

```
Implement Milestone M7 — Secondary Surfaces & Stub Cleanup — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M6 are complete. Read the M6 Milestone Completion Log row and §9 "M7 — Secondary Surfaces & Stub Cleanup".

WHAT IS COMPLETE (do not redo):
- M6: status edit (inline select, updateApplicationRecordInCloud), notes edit (textarea + save), artifact presence/open-package links (/output/[draftId]), archive verify + fix (load includeArchived: true, all filter excludes archived), saved-job PD (listJobDescriptionsFromCloud, saved-jobs-disclosure, /generate?jobId), unlinked draft history PD (unlinked-drafts-disclosure, !applicationId filter, /output/[id]).
- M5c: manual CL edit (clIsEditMode, clIsDirty, beforeunload, Save cover letter, Cancel), pending-only evidence staging, CL export gates verified, quick-action chips + tone selector verified functional.
- M5b: line-level bullet controls, tailoring diagnostics, fit summary, model-tier selects in Generate.
- M5a: structured editor, dirty/beforeunload, re-approval invalidation, Folio-native revision queue, PDF-on-approve two-mode preview.
- M4: Approve→Export card, server one-page gate, needs_review banner, load-failure honesty, experience toggles (whole-job).
- M4.6: CL export gate, AI step estimate, onboarding honesty, model-tier guardrail.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. All five active route clients stay mounted. Never swap an active route to a legacy page client. No active page.tsx may import InventoryPageClient, RecordsPageClient, GeneratePageClient, ResumePreviewPageClient, or CoverLetterPreviewPageClient. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow the Folio design system in docs/DESIGN.md. Sentence case; no shadows; folio-* tokens; rounded-xl cards; rounded-lg controls.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Onboarding upload: make the upload step real or remove it with honest labeling (D3 — user-trust issue). Option A: hide the upload UI entirely and add "Add your career history in Career Vault after setup." Option B: wire the file to parseDocxResume and save to resume_inventories (scope: full implementation). Recommend Option A (honesty, low risk) unless user directs otherwise; interim label was added in M4.6 but the upload UI is still present. Confirm choice before coding.
2. "Interview" filter stub (S2): the Interview tab at /records hardcodes return [] — either remove the tab or add status "interview" to APPLICATION_RECORD_STATUSES and EDITABLE_APPLICATION_RECORD_STATUSES. Confirm which approach before coding.
3. Settings page stub (S1): /settings is currently a placeholder — either add minimal account + preferences content (name, email display) or keep stub with honest "Coming soon" label rather than empty page. Confirm scope before coding.
4. Landing signed-in redirect (D6): when a signed-in user visits /, redirect to /dashboard. Current LandingHero has static links. Add a useEffect redirect in the landing page or middleware.
5. Dead buttons: audit for any remaining dead/stub UI elements in Folio shell (e.g., notifications icon in TopBar, "Add bullet point" button in Vault, any other non-functional CTAs). Remove or wire.
6. Retire /resume-preview and /cover-letter-preview routes: M5a absorbed structured editing into /output; M5c absorbed CL editing into /output. Remove the page.tsx imports and return notFound() from each, or delete the route folders. Update FOLIO_REDESIGN.md.

STAYS MOUNTED: all five active Folio route clients unchanged.

REFERENCES (read only — behavioral reference, never mount): ResumePreviewPageClient, CoverLetterPreviewPageClient (retire these; do not add new functionality).

BACKEND/DEPS: resume_inventories, stored_files for onboarding upload if implemented. application_records if interview status added. No new endpoints required for other items.

MUST NOT CHANGE: generation engine, export engine, evidence spine, model IDs, M4/M5a/M5b/M5c/M6 approval/export/archive gate semantics.

CHECKS: npm run test, npm run lint, npm run build. Add tests into existing suites only (docs/TESTING.md). Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix unless explicitly scoped): resume-generation-validation.test.ts (3 fails); draft-inventory-safety.test.ts (2 fails); 1 lint error in ProfilePageClient.tsx; 1 pre-existing TS error in application-records.test.ts (readonly tuple .includes() type narrowing). Report if they block your verification but do not expand scope.

After completing M7, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M7 complete in the Milestone Completion Log.
- Write the M8 opening prompt into the Chat Prompts section.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M8 Opening Prompt

```
Milestone M8 — Authenticated E2E Closure — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M7 are complete. Read the M7 Milestone Completion Log row and §9 "M8 — Authenticated E2E Closure".

WHAT IS COMPLETE (do not redo):
- M7: onboarding upload wired (parseDocxResume + saveResumeInventoryToCloud), interview status real, settings minimal account info, landing redirect verified, dead buttons removed, /resume-preview and /cover-letter-preview routes retired (notFound()).
- M6: status edit, notes edit, artifact links /output/, archive fix, saved-job PD, unlinked draft history PD.
- M5c: manual CL edit, pending-only evidence staging, CL export gates verified.
- M5b: line-level bullet controls, tailoring diagnostics, fit summary, model-tier selects.
- M5a: structured editor, dirty/beforeunload, re-approval invalidation, revision queue, PDF-on-approve two-mode preview.
- M4: Approve→Export card, server one-page gate, needs_review banner, load-failure honesty.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. All five active route clients stay mounted. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

PROTOCOL: This milestone is human-led. Claude assists from explicit observations and screenshots only. Do not write new product code unless the user surfaces a specific failing behavior.

SCOPE — verify each clause of the Minimum Pre-Folio Parity Contract (§5):
1. Core job-application path: sign in → Career Vault (upload parse OR existing inventory) → Generate (JD + base resume + context policy) → Output (resume + cover letter) → Approve → Export PDF/DOCX → Applications shows the record. Every hop reachable by direct URL reload.
2. Data safety: source resumes never mutated; overlay edits in InventoryEdits; Add-from-Text is extract→review→apply; project-like evidence never silently enters Work Experience; a failed persisted read is never treated as "empty."
3. Generation quality: evidence spine runs before generation; repair pipeline runs; needs_review surfaced; schema-constrained CL output applied.
4. Review/approval/export trust: server one-page PDF gate hard-blocks (422); approval state explicit; post-approval edits invalidate; structured filenames; private storage delivery; no export bypasses gate.
5. Recovery/failure handling: partial AI failure preserves resume and offers CL-only retry; save failures explicit; identity change re-scopes data; direct reload restores work.

HUMAN QA FLOW:
1. Sign in with an authenticated account.
2. Upload a DOCX resume in Career Vault — verify explicit saved/partial/failed state.
3. Open Generate — enter a real JD; confirm context policy summary visible; confirm AI step estimate shown.
4. Generate — confirm resume + cover letter produced; confirm /output/[draftId] is the destination.
5. Review Output — confirm Approve → Export card visible; one-page gate fires correctly on overflow.
6. Approve and download PDF and DOCX — confirm structured filenames.
7. Visit Applications — confirm new record present with status edit, notes, artifact links.
8. Direct-URL reload /output/[draftId] — confirm draft survives reload without treating load-failure as missing.
9. Onboarding (new user) — confirm upload step parses and saves to vault; skip works; profile saved.
10. Interview status — set one application to "interview" via status select; confirm Interview tab shows it.

STAYS MOUNTED: all five active Folio route clients unchanged.

MUST NOT CHANGE: generation engine, export engine, evidence spine, model IDs, approval/export/archive gate semantics.

After completing M8, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M8 complete in the Milestone Completion Log.
- Record any remaining known issues in docs/KNOWN_ISSUES.md.
```

### M9 Opening Prompt

```
Implement Milestone M9 — E2E Fix Batch — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M8 are complete. Read the M8 Milestone Completion Log row and §9 "M9 — E2E Fix Batch".

WHAT IS COMPLETE (do not redo):
- M8: authenticated E2E check passed; parity contract verified.
- M7: onboarding upload wired, interview status real, settings account info, dead buttons removed, preview routes retired.
- M6: status edit, notes edit, artifact links /output/, archive fix, saved-job PD, unlinked draft PD.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. All five active route clients stay mounted. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow docs/DESIGN.md. Sentence case; no shadows; folio-* tokens.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Dashboard: remove the duplicate "+" icon from the page body. The sidebar CTA stays; only the inline page body icon is removed.
2. Applications — status summary strip: add a count-by-status summary row above the table, derived from loaded records in local state. No new API call. Show counts for: drafting, resume_generated (display as "Ready"), applied, interview, rejected, archived.
3. Applications — "Resume Generated" display label: rename to "Ready" in all visible UI copy (status badges, filter tabs, expanded row details). DO NOT rename the underlying `resume_generated` status value in APPLICATION_RECORD_STATUSES or the database — that is a schema migration and is out of scope. Display label only.
4. Applications — status column truncation: fix the CSS so the status badge does not truncate on narrow columns.
5. Applications — Artifacts columns: split the current combined Artifacts column into two explicit columns — "Resume" (✓ if draft exists, — if not) and "Cover Letter" (✓ if draft exists, — if not). Replace formatApplicationArtifactSummary with per-column logic.
6. Career Vault — capital V: sweep all visible UI copy in the app (page titles, nav labels, onboarding copy, button labels, any component text) and ensure it consistently reads "Career Vault" — capital C, capital V.
7. Career Vault — Add-from-Text position: move the "Add experience from text" panel / disclosure to appear directly below the vault summary section, above the collated tabs. It currently appears at the bottom.
8. Career Vault — Keyword Bank: promote the Keyword Bank from the VMT section to the main Career Vault panel as a persistent named section (not inside the VMT disclosure). Position: after Add-from-Text, before or alongside the collated tabs. Remove it from VMT once promoted.
9. Profile icons: audit all avatar/profile icon surfaces across the app. TopBar avatar was wired to /profile in M7. Check: Dashboard header user display, sidebar user section, any other avatar or profile CTA. Wire all remaining ones to /profile.

SAFETY NOTE: Item 3 — "Resume Generated" → "Ready" is display label only. The status value resume_generated must not be changed anywhere in APPLICATION_RECORD_STATUSES, application-record.ts, or any database write. Changing the value would require a migration. If you are unsure whether a change touches the value (not just the label), stop and ask.

STAYS MOUNTED: all five active Folio route clients unchanged.

MUST NOT CHANGE: generation engine, export engine, evidence spine, model IDs, approval/export gate semantics, database schema, resume_generated status value.

CHECKS: npm run test, npm run lint, npm run build. Confirm application-records.test.ts (55/55) stays green after label changes. No new test suites needed. Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix): resume-generation-validation.test.ts (3 fails); draft-inventory-safety.test.ts (2 fails); 1 lint error in ProfilePageClient.tsx; 1 TS error in application-records.test.ts (readonly tuple .includes() type narrowing).

After completing M9, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M9 complete in the Milestone Completion Log.
- Write the MX opening prompt into the Chat Prompts section (it already exists — update if needed).

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### MX Opening Prompt

```
Implement Milestone MX — Career Vault Overhaul — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M9 are complete. Read the M9 Milestone Completion Log row and §9 "MX — Career Vault Overhaul".

WHAT IS COMPLETE (do not redo):
- M9: Dashboard duplicate "+" removed; Applications summary strip, "Ready" label, artifacts columns, status truncation; Career Vault capital V sweep, Add-from-Text moved to top, Keyword Bank promoted to main UI; Profile icons wired.
- M2: DOCX upload/parse with explicit states; overlay edit/hide/restore; Add-from-Text extract≠save; VMT panels wired (functional but legacy-styled).

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: Folio is the visual/product baseline. CareerVaultPageClient stays mounted at /inventory. Never swap an active route to a legacy page client. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow docs/DESIGN.md. Sentence case; no shadows (depth via hairline borders + tonal surfaces); rounded-xl cards (12px); rounded-lg controls (8px); folio-primary-container for primary actions; folio-sage-border for card borders.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

SCOPE (only this, nothing else):
1. Restyle VMT panels to Folio-native tokens: EnrichmentReviewPanel, InventoryDuplicateCleanupPanel, InventoryProjectCleanupPanel, InventoryTextExtractionPanel, UploadCard. Replace slate-* classes with folio-* tokens, rounded-xl/rounded-lg, sentence case, no shadows. Do not change any interaction logic, data wiring, or panel behavior.
2. Fix shadow-md on Vault FAB buttons — replace with folio-sage-border hairline border per DESIGN.md.
3. Port Inventory Summary from the legacy upload page: add a summary section in the main Career Vault panel (above the upload CTA) showing parsed bullet counts, upload date, and parse quality for the user's current inventory. Source data from the loaded inventory state — no new API call required.
4. Add Uploaded Resumes list to VMT: show the list of raw uploaded files (from stored_files / original-resume-files) inside the VMT section so users can see what source files they have. View only — no delete in this milestone.
5. Reorganize VMT section: rename to "Vault maintenance" (sentence case); order inside: Enrichment Review → Duplicate Cleanup → Project Cleanup → Uploaded Resumes. Keyword Bank was promoted to the main panel in M9 — ensure it is not duplicated in VMT.
6. Sentence case and capitalization sweep inside VMT: all section headings and item labels inside the VMT disclosure must follow sentence case per DESIGN.md.

STAYS MOUNTED: CareerVaultPageClient (restyle + reorganization only — client, wiring, and data contracts unchanged).

REFERENCES: setup/ panel components are the restyle targets. Legacy upload page (UploadCard, inventory stats display) is the behavioral reference for the Inventory Summary — do not mount the legacy page.

MUST NOT CHANGE: Vault data wiring, evidence semantics, panel interaction logic, upload/parse engine, Add-from-Text extract≠save contract, source resumes.

CHECKS: npm run test, npm run lint, npm run build. Verify panels render without shadow-*/slate-* tokens. Verify Inventory Summary shows real data. No new test suites needed. Update docs under /docs only.

KNOWN PRE-EXISTING RED (NOT introduced by you; do NOT fix): resume-generation-validation.test.ts (3 fails); draft-inventory-safety.test.ts (2 fails); 1 lint error in ProfilePageClient.tsx; 1 TS error in application-records.test.ts.

After completing MX, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark MX complete in the Milestone Completion Log.
- Write the M10a opening prompt into the Chat Prompts section (it already exists — update if needed).

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

### M10a Opening Prompt

```
Milestone M10a — Output Editor Redesign: Design Session — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M9 and MX are complete. Read the MX Milestone Completion Log row and §9 "M10a — Output Editor Redesign: Design Session".

THIS IS A DESIGN SESSION ONLY. No application code will be written or changed in this milestone. The output is a written layout proposal that the user must agree on before M10b implementation begins.

WHY THIS EXISTS: M4–M5b correctly decomposed the legacy Output Editor capabilities but stacked them as collapsed right-panel disclosures. The resulting UX does not work as a coherent whole. This session decides the layout and interaction architecture before any implementation.

WHAT IS CURRENTLY IN THE OUTPUT EDITOR (do not assume, read the code):
- OutputEditorPageClient.tsx is the only active client at /output/[draftId]
- Left panel: RenderedResume HTML view (default) or StructuredResumeEditor (edit mode toggle); after exportReady: ResumePdfPreview A4 iframe
- Right panel (collapsed disclosures): revision queue, bullet controls, fit summary, tailoring diagnostics
- Review and export card at top: Approve → Export flow, one-page gate, needs_review banner
- CL tab: body view/edit, evidence staging, quick-action chips, tone selector, export gate

DESIGN DECISIONS TO SETTLE (read the legacy reference clients for behavioral context, then propose):

1. Fit summary + score: should appear prominently at the top of the Resume tab after generation — not in a collapsed right-panel disclosure. Propose exact placement and what data to surface (score, headline verdict, key gaps).

2. Dual-view toggle: after generation, two views should be available — Folio text view (default, current RenderedResume) and PDF view (current ResumePdfPreview). Propose the toggle mechanic: tab switch, button toggle, or split view. The PDF view does not require approval first in the redesign — it should be available on demand.

3. Selectable bullet blocks: in the text view, each bullet should render as a selectable block. When selected, per-bullet actions appear: remove, edit (inline), replace (triggers single-bullet regeneration). Propose how this interacts with the existing re-approval invalidation (editing a bullet after approval must downgrade to layout_changed) and with the evidence controls (excluded bullets already tracked in lineLevelExcludedBulletKeys).

4. Layout controls + live PDF view: audit the legacy ResumePreviewPageClient for layout controls (font size, line spacing, margins, section spacing). Propose how these fit in the Folio Output Editor alongside the PDF view — live preview on control change is the goal.

5. Export UX consolidation: currently two separate Export PDF / Export DOCX cards/boxes exist. Propose a single consolidated export zone — one card or section that contains both actions, the approval state, the one-page gate result, and download buttons.

6. "Mark as sent" behavior: this currently sets the application record status to "applied". Decide: surface it more clearly (e.g., a button in the export zone with a tooltip explaining what it does), move it, or remove it if it duplicates status edit in Applications.

7. Right panel reorganization: given that fit summary moves to main, and bullet selection replaces the collapsed bullet controls, decide what remains in the right panel. Candidate: revision queue (batch scoped instructions), tailoring diagnostics (omitted evidence warnings). Everything else should either move to main panel or be removed.

8. CL tab — secondary formats: Email intro, LinkedIn message, Recruiter note, WhatsApp intro are missing. These exist in the legacy SecondaryCommunicationsPanel. Propose placement in the CL tab — a separate sub-tab or a collapsible section below the main CL body.

REFERENCES TO READ (for behavioral context — do not mount):
- src/components/pages/OutputEditorPageClient.tsx — current state
- src/components/pages/ResumePreviewPageClient.tsx — layout controls reference
- src/components/setup/SecondaryCommunicationsPanel.tsx — secondary formats reference
- src/components/resume-drafts/ResumePdfPreview.tsx — PDF view component
- docs/DESIGN.md — visual language constraints

OUTPUT OF THIS SESSION:
- A written design proposal covering all 8 topics above, presented to the user for approval.
- After user approves, record the agreed decisions in docs/OUTPUT_EDITOR_DESIGN.md.
- Mark M10a complete in the Milestone Completion Log.
- Write the M10b opening prompt (with the agreed design decisions embedded) into the Chat Prompts section.

DO NOT write any application code. DO NOT edit OutputEditorPageClient.tsx or any other source file.
```

### M10b Opening Prompt

```
Implement Milestone M10b — Output Editor Redesign: Implementation — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md and docs/OUTPUT_EDITOR_DESIGN.md in full before doing anything else. The design document is the source of truth for this milestone. M1–M9, MX, and M10a are complete.

IMPLEMENT EXACTLY THE AGREED DESIGN FROM M10a. Do not add features beyond what was agreed. Do not revisit design decisions — those are settled.

REPO: C:\Dev\AIAP\resume-copilot
BRANCH: folio-recovery. Confirm with `git branch --show-current`. Do NOT touch main (a4d17e3, production).

NON-NEGOTIABLE: OutputEditorPageClient stays mounted at /output/[draftId]. Never swap an active route to a legacy page client. No active page.tsx may import any of the five forbidden legacy clients. The forbidden-remount rule is enforced by tests/suites/app-shell.test.ts — keep it green.

DESIGN: All UI must follow docs/DESIGN.md and docs/OUTPUT_EDITOR_DESIGN.md. Sentence case; no shadows; folio-* tokens; rounded-xl cards; rounded-lg controls.

PROTOCOL: Ask clarifying questions before writing any code. State what you plan to do and wait for confirmation.

STAYS MOUNTED: OutputEditorPageClient.

MUST NOT CHANGE: export engine, page-count truth, filename scheme, generation engine, model IDs, evidence spine, approval/export gate semantics (server one-page gate remains the export truth).

INDEPENDENT REVIEW: required before merge. After implementation and verification, open a fresh Opus chat with the review brief + diff only — no implementation history.

CHECKS: npm run test, npm run lint, npm run build. Extend existing suites only. Update docs under /docs only.

After completing M10b, update docs/FOLIO_RECOVERY_ROADMAP.md:
- Mark M10b complete in the Milestone Completion Log.
- Record any remaining known issues in docs/KNOWN_ISSUES.md.

OUTPUT (at the end): files changed, behavior changed, tests/checks run, known risks, next steps, copy-paste git commands.

Before coding, complete the 10-point Build Plan Checklist in docs/HANDOFF.md and confirm this is one focused milestone.
```

---

## 14. Milestone Completion Log

| Milestone | Status | Completed | Notes |
|---|---|---|---|
| M1 — Foundation lock, route-contract safeguards | ✅ Complete | 2026-06-28 | Cherry-picked `56bc7c5` + `0877eb2` (clean, sit directly on `7aec1d0`); added 10 route-contract + forbidden-remount checks to `app-shell.test.ts` (scoped to 5 active routes); refreshed 9 stale pre-Folio shell assertions to the Folio shell; verified sign-out / signup→confirm-email / profiles migration (no behavior change); documented the forbidden-remount rule + fixed a stale route table in `FOLIO_REDESIGN.md`. **Pre-existing red carried forward (not M1):** `resume-generation-validation` (3 fails, generation-semantics area — forbidden to touch in M1); lint has 2 pre-existing errors in untouched files (`ProfilePageClient.tsx`). `npm run build` green; M1 suites green when run directly. |
| M2 — Career Vault minimum parity | ✅ Complete | 2026-06-28 | DOCX upload dialog keeps open while parsing and shows explicit saved/partial/failed states from inventory diff (no silent bad parse); revert-to-original per bullet clears `editedBulletTextByBulletKey` overlay (source resumes never touched); save error surfaced in `inventory-unsaved-changes-banner`; `InventoryTextExtractionPanel` wired with `onSaveApplied` only on Apply (extract≠save confirmed); `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel` brought into `CareerVaultPageClient` under "Vault management tools" progressive-disclosure section — legacy clients never mounted. New checks added to `inventory-edits`, `inventory-text-extraction`, `inventory-duplicate-cleanup`, and `draft-inventory-safety` suites. **Pre-existing red carried forward (not M2):** `resume-generation-validation` (3 fails); `draft-inventory-safety` (`updateGeneratedResumeDraftInCloud` / `deleteGeneratedResumeDraftFromCloud`, 2 fails); lint errors in `NewApplicationPageClient.tsx` + `ProfilePageClient.tsx` (2 errors, all untouched files). Build green; M2 suites green when run directly. **Known debt [M4.5]:** Vault management tools reuse legacy slate-styled `setup/` panels (`EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, `InventoryTextExtractionPanel`, `UploadCard`) — wired correctly and functional, but legacy styling accepted as temporary debt; restyle/decompose to Folio-native tokens assigned M5b. `shadow-md` on Vault FAB buttons is an additional DESIGN.md violation in the same pass. |
| M3 — Generate minimum parity | ✅ Complete | 2026-06-28 | Saved-job match banner added to `NewApplicationPageClient`: live detection via `findDuplicateJobDescription` + `normalizeJobDescriptionInput`; "Reuse saved job" fills form + sets `editingJobId`; "Start fresh" dismisses per-match. Context policy summary (headline + detail, `data-testid="generate-context-policy-summary"`) added to `embeddedMode` path of `GenerateTailoredResumeSection` so users see JD-only vs website+JD vs confidential before clicking Generate. Partial-failure recovery (resume preserved, "Retry Cover Letter" offered, retry skips resume API) was already complete — confirmed by full `generation-partial-failure` suite pass. 4 new checks added to `generate-flow.test.ts`. Fixed 2 pre-existing lint errors in `NewApplicationPageClient.tsx` (unescaped apostrophe + unused `signInRequiredReason`). **Pre-existing red carried forward (not M3):** `resume-generation-validation` (3 fails); `draft-inventory-safety` (2 fails); lint in `ProfilePageClient.tsx` (1 error). Build green; M3 suites green. **Known gap [M4.6]:** AI step cost estimate listed as "Present" in capability matrix but confirmed missing from active Folio Generate flow — add in M4.6. |
| M4 — Output core delivery | ✅ Complete | 2026-06-28 | All surfacing landed in `OutputEditorPageClient.tsx` (the only client touched) — backend approve/validate/export gate was already complete and correct, so **no route/schema/engine changes**. Added a dedicated **Review and export** card (`data-testid="output-approve-export"`) at the top of the Resume tab implementing the explicit two-step **Approve → Export** flow: Approve calls `approveResumeDraftForExport` (`/api/approve/resume-draft`), which server-validates one page and persists `status="approved"` + `serverPdfValidation`; export unlocks only when `exportReady` (approved + `serverPdfValidation.pageCount === 1` + layout equal). **Server one-page hard gate (422)** surfaced via `ResumePdfOnePageBlockedError` + `formatOnePageBlockedMessage` as an actionable block (`output-one-page-block`) listing server `suggestedActions` — never silent. PDF/DOCX export wired through the existing `exportResume*FromApi` + `deliverExportedFile` (structured filenames + private storage unchanged); **topbar exports gated** (`isExportingPdf \|\| !exportReady`) so there is no visual bypass. **needs_review banner** (`output-needs-review-banner`, banner-only per scope decision) shown before the approve CTA. **Post-approval invalidation** wired to Regenerate (clears `validationFailure`; fresh content downgrades status) — structured-edit invalidation deferred to M5a. **Failed-load vs confirmed-missing honesty**: load effect now distinguishes `loadFailed` (retryable, `output-load-failed`) from `notFound`, with the company-context fetch isolated so a context failure never masquerades as a missing draft. Mark-as-sent left untouched. Checks added to `resume-approve-validation`, `resume-pdf-page-count`, `resume-export-delivery`, `application-package-ux`; `/output` route-contract + forbidden-remount stay green. **Pre-existing red carried forward (not M4):** `resume-generation-validation` (3 fails); `draft-inventory-safety` (`updateGeneratedResumeDraftInCloud` / `deleteGeneratedResumeDraftFromCloud`, 2 fails); 1 lint error in `ProfilePageClient.tsx` (untouched). Build green; M4 suites green when run directly. **Independent Opus review required before merge.** **Known gap [M4.5]:** Visual resume preview is screen-scaled HTML (`RenderedResume` component) — not A4/PDF-truth faithful; server gate remains export truth; A4 visual preview capability gap assigned to M5a. |
| M4.5 — Post-M4 capability matrix reconciliation | ✅ Complete | 2026-06-28 | Roadmap-only update. Reconciled matrix, milestone owners, and post-rollback audit. Settled 8 decisions: A4 preview → M5a; model-tier selector → INV then M5b; Vault tool reuse → accepted debt, restyle MX (optional); preview route policy → grandfathered-secondary, retire M7; onboarding honesty → interim label/hide by M7; source-resume debug → parked; model IDs → investigate before M5b; CL export gate → verify M5c. Strengthened §6 safeguard and §10.9 to cover sub-panels. No application code changed. |
| M4.6 — Pre-M5a bug fixes + M3 gap closure | ✅ Complete | 2026-06-28 | (1) CL export gate fixed in `OutputEditorPageClient`: imported `detectBannedPhrases`, computed `bannedPhrases` + `exportBlocked`, gated both download buttons on `overLimit \|\| bannedPhrases.length > 0`, added visible error message with reason (over-limit or banned-phrase list). (2) AI step cost estimate added to `embeddedMode` branch of `GenerateTailoredResumeSection`: dynamic `aiStepEstimate.headline` (already computed via `estimateGenerateAiSteps`) rendered as caption below Generate CTA; `data-testid="generate-ai-step-estimate"`. (3) Onboarding subtitle honest: `STEP_SUBS[1]` changed to "Upload your resume — you can add it to your career vault after setup." — no longer implies parsing. (4) Model-tier guardrail: `logGeminiCallMetadata` in `call-gemini.ts` now emits `console.warn` (with requested model ID, actual model used, and tier) when `fallbackApplied` is true; normal path unchanged (`console.info`). **Pre-existing red carried forward (not M4.6):** `resume-generation-validation.test.ts` (3 fails); `draft-inventory-safety.test.ts` (2 fails); 1 lint error in `ProfilePageClient.tsx`. Build green; test suite green (pre-existing fails only). |
| M5a — Output: structured edit + revision queue + PDF-on-approve preview | ✅ Complete | 2026-06-29 | All surfacing landed in `OutputEditorPageClient.tsx` — no backend/schema/engine changes. **(1) Structured editor:** In-place toggle (`isEditMode` state) swaps left panel between read-only `RenderedResume` and `StructuredResumeEditor` (Folio-native form). Editor covers all sections: header/contact, professional summary, experience bullets (add/remove/edit within existing roles — no creating brand-new roles), skills groups + items, education bullets, additional experience items. **(2) Dirty state + beforeunload:** `isDirty` bool tracked; `beforeunload` listener added while dirty; unsaved-edits banner (`editor-dirty-banner`) shown in panel; Cancel resets without saving. **(3) Re-approval invalidation:** Both structured-edit save handler and revision-queue accept handler call `resolveDraftStatusAfterContentEdit(draft.status)` before persisting — downgrades `approved`/`layout_changed` → `layout_changed`, strips `serverPdfValidation`. The M4 `exportReady` derivation and `layoutChangedAfterApproval` banner then re-derive automatically from the saved draft. Layout changes (font size etc.) are already handled by `areExportLayoutSettingsEqual` in the existing `exportReady` derivation — no additional change needed. **(4) Folio-native revision queue:** `ResumeRevisionQueue` component mounted in right 40% column as a collapsed `<details>`-style disclosure (chevron toggle, `revision-queue-toggle`). Features: scope select (professional summary / selected role), role select, instruction textarea, model tier select (standard/enhanced/premium via `resolveResumeModelTierForDraft`/`writeStoredResumeModelTier`), staged queue list (add/remove items), "Revise selected sections" triggers one batch Gemini call via `requestResumeBatchRevision(persist: false)`, preview panel shows proposed changes (summary + per-role bullet diff), Accept all saves via `handleRevisionQueueAccepted` (same invalidation path as structured edit), Reject all discards. Staging/typing NEVER calls AI. **(5) PDF-on-approve two-mode preview:** Before export-ready: `RenderedResume` HTML. After `exportReady` (approved + `serverPdfValidation.pageCount === 1` + layout equal): `ResumePdfPreview` with document model from `buildExportResumeDocumentModel` + `findReferenceResumeInInventory`. `ResumePreviewPageClient` never mounted. `app-shell` route-contract + forbidden-remount: green. `resume-draft-review` suite: green. **Pre-existing red carried forward (not M5a):** `resume-generation-validation.test.ts` (3 fails); `draft-inventory-safety.test.ts` (2 fails); 1 lint error in `ProfilePageClient.tsx`. **Alternatives noted for docs:** Q1 (editing placement): right-panel form and modal variants were considered; in-place left-panel toggle was chosen for direct context. |
| M5b — Output: evidence controls + diagnostics + fit summary + model-tier | ✅ Complete | 2026-06-29 | All surfacing landed in `OutputEditorPageClient.tsx` and `GenerateTailoredResumeSection.tsx` — no backend/schema/engine/endpoint changes. **(1) Line-level bullet controls:** New collapsed disclosure (`bullet-controls-toggle`) in the right panel. For included experience bullets with `sourceRefs[].bulletKey`: checkbox to exclude from next Regenerate → `lineLevelExcludedBulletKeys`. For excluded experience inventory bullets with `inventoryBulletKey`: checkbox to force into next Regenerate → `lineLevelForcedBulletKeys`. Both sets merged in `buildMergedControls()` (alongside existing whole-job toggles) before the Regenerate call. Changes staged only — no AI on toggle, no auto-save. **(2) Tailoring diagnostics:** New collapsed disclosure (`tailoring-diagnostics-toggle`) in the right panel. Calls `buildPackageTailoringDiagnostics({ resumeDraft: draft, jobDescription: linkedJob })` via `useMemo` — no AI. Displays selected evidence, omitted evidence (with "Advisory only — not a defect" label, `tailoring-omitted-evidence`), and warnings in Folio-native list rows. **(3) Fit summary:** New collapsed disclosure (`fit-summary-toggle`) in the right panel. Calls `buildPackageFitSummary({ rationale: draft.rationale })` via `useMemo` — no AI. Shows the derived text or `PACKAGE_FIT_SUMMARY_UNAVAILABLE` fallback. **(4) Model-tier selector in Generate flow:** `MODEL_TIERS` + `MODEL_TIER_LABELS` imported in `GenerateTailoredResumeSection.tsx`; two Folio-native selects added to the `embeddedMode` render path between context policy card and Generate button — resume model (`generate-resume-model-tier`) and cover letter model (`generate-cl-model-tier`) — using the existing internal `resumeModelTier`/`setCoverLetterModelTier` state and `writeStoredResumeModelTier`/`writeStoredCoverLetterModelTier` on change. **Tests:** 14 new checks added to `application-package-ux.test.ts`. **Pre-existing red carried forward (not M5b):** `resume-generation-validation.test.ts` (3 fails); `draft-inventory-safety.test.ts` (2 fails); 1 lint error in `ProfilePageClient.tsx`. Build green; M5b suites green. |
| M5c — Cover-letter editing + evidence + export gates | ✅ Complete | 2026-06-29 | All surfacing landed in `OutputEditorPageClient.tsx` — no backend/schema/engine/endpoint changes. **(1) Manual CL edit:** `clIsEditMode` state toggles between read-only paragraph view and an editable textarea (`cl-edit-textarea`). `clIsDirty = body !== coverLetter.body` tracks unsaved edits. `beforeunload` guard fires while dirty. "Save cover letter" button (`cl-save-button`, disabled when `!clIsDirty`) calls `updateGeneratedCoverLetterDraftInCloud(coverLetter.id, { body })`, updates the loaded record in state (making dirty = false), and exits edit mode. "Cancel" button resets body to `coverLetter.body` and exits edit mode. Quick-action chips and tone selector disabled while in edit mode to prevent overwriting unsaved manual edits. Re-approval invalidation not needed (CL does not gate PDF export). **(2) Pending-only evidence staging:** `pendingEvidenceControls: CoverLetterEvidenceControls` state initialized to `{ forcedEvidenceIds: [], excludedEvidenceIds: [] }`. `evidenceRows` memo builds spine via `buildActiveCollatedInventory` + `buildAcceptedWordingByBulletKey` + `buildCompanyContext` + `buildEvidenceSpine` → `buildCoverLetterProofEvidenceList(spine, pendingControls)` (no AI, pure functions). Folio-native collapsible disclosure (`cl-evidence-staging-toggle`) shows per-row "Use in cover letter" / "Avoid in cover letter" buttons with staged state highlighted. Summary box (`cl-evidence-queue-summary`) shown when any controls are staged. `handleRegenerate` passes `evidenceControls: normalizeCoverLetterEvidenceControls(pendingEvidenceControls)` to `generateAndSaveCoverLetterDraft`; cleared to empty after success (single-use). Staging never calls AI; never auto-saves. **(3) CL export gates verified:** `exportBlocked = overLimit \|\| bannedPhrases.length > 0` already correctly computed; download buttons already gated on `exportBlocked` from M4.6. No code change needed — verified and noted. **(4) Quick-action chips + tone selector verified:** already fully functional from M4.6. No code change needed. **Tests:** 18 new M5c checks added to `application-package-ux.test.ts`. All 87 checks green. `app-shell.test.ts` (35/35) and `resume-draft-review.test.ts` (21/21) unchanged and green. **Pre-existing red carried forward (not M5c):** `resume-generation-validation.test.ts` (3 fails); `draft-inventory-safety.test.ts` (2 fails); 1 lint error in `ProfilePageClient.tsx`. Build green; test suites green. |
| M6 — Applications parity | ✅ Complete | 2026-06-29 | All surfacing landed in `ApplicationsPageClient.tsx` — no backend/schema/engine changes. **(1) Status edit:** Inline `<select>` in expanded row details using `EDITABLE_APPLICATION_RECORD_STATUSES`; `handleStatusChange` calls `updateApplicationRecordInCloud({ status })` and updates local state. **(2) Notes:** Textarea + "Save notes" button in expanded row details; `handleSaveNotes` calls `updateApplicationRecordInCloud({ notes })`; `notesDraftById` tracks per-record draft state initialized from loaded records. **(3) Artifact presence + open package links:** Artifact column shows resume ✓/— and cover letter ✓/✗/— via `formatApplicationArtifactSummary`; eye-icon link updated from `/resume-preview/[id]` → `/output/[id]`; expanded details shows dedicated resume draft link + cover letter presence row both linking to `/output/[draftId]`. **(4) Archive verify + fix:** Bug confirmed — `listApplicationRecordsFromCloud()` with no options omits archived records, making the Archived tab always empty. Fixed by loading with `{ includeArchived: true }` and updating `filterApplications("all")` to exclude archived (`status !== "archived"`). Archive action updates local state in-place (`status: "archived"`) so the record moves to Archived tab without a reload; archive-without-delete semantics unchanged. **(5) Saved-job management PD:** `<details>` disclosure (`saved-jobs-disclosure`) below the table, listing applications with a linked job description (`jobById` lookup via `listJobDescriptionsFromCloud`). Per-record: JD summary preview + link to `/generate?jobId=[id]` ("Re-use on Generate"). **(6) Unlinked draft history PD:** `<details>` disclosure (`unlinked-drafts-disclosure`) below the table, listing drafts where `!d.applicationId` via `buildDraftListDisplays`; each row links to `/output/[id]` — view only; no delete. **Tests:** 25 new M6 checks added to `application-records.test.ts` (55/55 total green). `app-shell.test.ts` (35/35) unchanged and green. **Pre-existing red carried forward (not M6):** `resume-generation-validation.test.ts` (3 fails); `draft-inventory-safety.test.ts` (2 fails); 1 lint error in `ProfilePageClient.tsx`; 1 pre-existing TS error in `application-records.test.ts` (readonly tuple `.includes()` type narrowing — shifted from line 78 → 82 by test edits). Build green; lint 0 new errors. |
| M7 — Secondary surfaces & stub cleanup | ✅ Complete | 2026-06-29 | **(1) Onboarding upload wired (Option B):** `onboarding/page.tsx` step 2 now calls `parseDocxResume(file)` + `upsertResume` + `saveResumeInventoryToCloud` on Continue; only `.docx` accepted (non-docx shows an honest error); "Skip for now" skips to profile without saving; status messages ("Parsing resume…" / "Saving to vault…") shown during async work; step 3 shows a success notice "Resume parsed and saved to your career vault" or a fallback notice on parse failure. **(2) Interview status (S2):** Added `"interview"` to `APPLICATION_RECORD_STATUSES` (after `"applied"`, before `"rejected"`) and corrected `filterApplications("interview")` from `return []` to `return applications.filter((a) => a.status === "interview")` — the Interview tab now shows real records. **(3) Settings minimal content (S1):** `settings/page.tsx` converted to a client component that reads the auth user email and profile name/target role from Supabase on mount — shown as read-only account info; preferences section has honest "coming soon" copy. **(4) Landing redirect (D6):** Already complete in middleware (`isRootPath && hasSession → redirect /dashboard`) — verified, no code change needed. **(5) Dead buttons removed:** Notification bell removed from `TopBar.tsx` (no notifications system); avatar wired as a `<Link href="/profile">` (previously a dead button). "Add bullet point" ghost button removed from `CareerVaultPageClient.tsx` (no handler, no structured edit at the Vault panel level). **(6) Preview routes retired:** `/resume-preview/[draftId]/page.tsx`, `/resume-preview/[draftId]/edit/page.tsx`, and `/cover-letter-preview/[draftId]/page.tsx` all replaced with `notFound()`. Their behavior was absorbed by `/output` in M5a/M5c. `FOLIO_REDESIGN.md` updated to mark routes retired. **Pre-existing red carried forward (not M7):** `resume-generation-validation.test.ts` (3 fails); `draft-inventory-safety.test.ts` (2 fails); 1 lint error in `ProfilePageClient.tsx`; 1 pre-existing TS error in `application-records.test.ts` (readonly tuple `.includes()` type narrowing — now reflects updated union including "interview"). Build green; suites green. |
| M8 — Authenticated E2E closure | ✅ Complete | 2026-06-30 | Human-led E2E check passed. All five parity contract clauses verified with authenticated data. Findings recorded: Dashboard duplicate CTA, Applications label/column issues, Career Vault layout/copy issues, Output Editor UX gaps, Profile icon wiring. Follow-up milestones M9, MX, M10a/b opened. |
| M9 — E2E fix batch | ✅ Complete | 2026-06-30 | **(1) Dashboard duplicate "+":** Removed the `<Link href="/generate">` header button with plus icon from `DashboardPageClient.tsx` — sidebar CTA unchanged. **(2) Applications status summary strip:** Count-by-status pill row added above the filter tabs in `ApplicationsPageClient.tsx`, derived from loaded `applications` state — no new API call. Shows Drafting, Ready, Applied, Interview, Rejected, Archived counts (zeros hidden). **(3) "Resume Generated" → "Ready" display label:** `formatApplicationStatusLabel("resume_generated")` changed to `"Ready"` in `labels.ts`. Status value `resume_generated` untouched in `APPLICATION_RECORD_STATUSES`, types, DB. **(4) Status badge truncation:** Added `whitespace-nowrap` to status badge `<span>` in Applications table row. **(5) Artifacts split columns:** Single "Artifacts" column replaced with two explicit "Resume" and "Cover Letter" columns (✓/—) in the Applications table; `formatApplicationArtifactSummary` import removed; `colSpan` updated from 6 → 7; `application-records.test.ts` assertions updated for new `artifact-resume` / `artifact-cover-letter` testids and "Ready" label. **(6) Career Vault capital V:** Swept `nav.ts` ("Career Vault"), `CareerVaultPageClient.tsx` (page title + dialog description), `DashboardPageClient.tsx` (vault health banner), `onboarding/page.tsx` (step subtitle + success notice). **(7) Add-from-Text position:** `InventoryTextExtractionPanel` block moved from below the VMT section to between the vault health card and the tab nav in `CareerVaultPageClient.tsx`. FABs still control `extractionPanelOpen`. **(8) Keyword Bank promoted:** Keyword Bank rendered as a persistent named section in `CareerVaultPageClient.tsx` directly from `inventory.enrichment.keywordBank`, positioned after Add-from-Text and before the tabs. Added `hideKeywordBank?: boolean` prop to `EnrichmentReviewPanel`; passed `hideKeywordBank={true}` from VMT so the bank doesn't double-render. Folio-native tokens (no slate). **(9) Profile icons audit:** TopBar already links to /profile (M7); AppNav has Profile nav item; no other user-avatar surfaces found. No code change needed. **Tests:** `application-records.test.ts` 55/55 green. `app-shell.test.ts` 35/35 green. Pre-existing red unchanged: `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`, 1 TS error in `application-records.test.ts`. Build green. |
| MX — Career Vault overhaul | Not started | — | Scope expanded from restyle-only: adds Inventory Summary port, Uploaded Resumes list, VMT reorganization. Unblocked by M8. |
| M10a — Output Editor redesign: design session | Not started | — | — |
| M10b — Output Editor redesign: implementation | Not started | — | Blocked on M10a design approval. Independent Opus review required before merge. |

---

## 15. CLI Session Log

Each entry records what changed, what was verified, and the suggested git commands for that session. Add one entry per CLI session at close.

---

### 2026-06-29 — M5a implementation

**Branch:** `folio-recovery`
**Milestone:** M5a — Output: Structured Edit + Revision Queue + PDF-on-Approve Preview

**Files changed**
- `src/components/pages/OutputEditorPageClient.tsx` — full M5a implementation (structured editor, dirty/beforeunload, re-approval invalidation, Folio-native revision queue, PDF-on-approve two-mode preview)
- `docs/FOLIO_RECOVERY_ROADMAP.md` — M5a completion log entry, M5b opening prompt

**Behavior changed**
1. **Structured editor** — "Edit resume" toggle enters a Folio-native form covering all sections (header/contact, professional summary, experience bullets within existing roles, skills groups/items, education bullets, additional experience items). Cancel discards; Save persists and returns to read-only view.
2. **Dirty state + beforeunload** — `isDirty` tracked; unsaved-edits banner shown; `beforeunload` listener fires if user tries to navigate away with unsaved edits.
3. **Re-approval invalidation** — both structured-edit save and revision-queue accept call `resolveDraftStatusAfterContentEdit` before persisting, which downgrades `approved → layout_changed` and strips `serverPdfValidation`. The M4 `exportReady` / `layoutChangedAfterApproval` banners re-derive automatically.
4. **Revision queue** — collapsed disclosure in right column (`revision-queue-toggle`); scope select (professional summary / selected role); role select; instruction textarea; model tier select (standard/enhanced/premium, persisted via `writeStoredResumeModelTier`); staged queue list (add/remove items); one batch Gemini call on "Revise selected sections" via `requestResumeBatchRevision(persist: false)`; preview diff (summary + per-role bullets); Accept all saves + invalidates approval; Reject all discards. Staging/typing never calls AI.
5. **PDF-on-approve two-mode preview** — before `exportReady`: `RenderedResume` HTML; after `exportReady` (approved + `serverPdfValidation.pageCount === 1` + layout equal): `ResumePdfPreview` (A4-constrained iframe of exact Puppeteer HTML) built from `buildExportResumeDocumentModel` + `findReferenceResumeInInventory`. `ResumePreviewPageClient` is never mounted.

**Checks run**
- `npx tsx tests/suites/app-shell.test.ts` — ✅ 18/18 green
- `npx tsx tests/suites/resume-draft-review.test.ts` — ✅ 18/18 green
- `npx tsc --noEmit` — 0 new errors in changed files (pre-existing test-file TS errors unchanged)
- Pre-existing red (not M5a): `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`

**Known risks**
- `ResumeRevisionQueueItem` type (`src/types/resume-draft.ts`) does not include `id` — the queue component generates its own local `id` via `createQueueItemId()` for React key/removal purposes only; this id is never sent to the API or persisted. Verify this is fine before M5b touches the queue.

**Suggested git commands**
```bash
git status
git add src/components/pages/OutputEditorPageClient.tsx docs/FOLIO_RECOVERY_ROADMAP.md
git commit -m "M5a: structured editor, dirty/beforeunload, re-approval invalidation, Folio-native revision queue, PDF-on-approve two-mode preview"
```

---

### 2026-06-29 — M5b implementation

**Branch:** `folio-recovery`
**Milestone:** M5b — Output: Evidence Controls + Tailoring Diagnostics + Fit Summary + Model-Tier

**Files changed**
- `src/components/pages/OutputEditorPageClient.tsx` — new imports (`buildPackageFitSummary`, `PACKAGE_FIT_SUMMARY_UNAVAILABLE`, `buildPackageTailoringDiagnostics`); new state (`lineLevelExcludedBulletKeys`, `lineLevelForcedBulletKeys`, `showBulletControls`, `showFitSummary`, `showDiagnostics`); `buildMergedControls()` updated to merge line-level keys; two new memos (`fitSummary`, `tailoringDiagnostics`); three new collapsible right-panel sections (bullet controls, fit summary, tailoring diagnostics)
- `src/components/setup/GenerateTailoredResumeSection.tsx` — added `MODEL_TIERS`, `MODEL_TIER_LABELS` to model-tiers import; added two Folio-native model-tier selects (`generate-resume-model-tier`, `generate-cl-model-tier`) to the `embeddedMode` render path
- `tests/suites/application-package-ux.test.ts` — added `generateSection` file read; 14 new M5b checks

**Behavior changed**
1. **Bullet controls** — collapsed disclosure in right panel. Included experience bullets: checkbox to exclude from next Regenerate (strikethrough when excluded). Excluded experience inventory bullets: checkbox to force into next Regenerate. Changes are staged in state and merged via `buildMergedControls()` before the Regenerate call — no AI on toggle, no auto-save. A note "Changes take effect on next Regenerate" shown when any staging is active.
2. **Tailoring diagnostics** — collapsed disclosure in right panel. `buildPackageTailoringDiagnostics` called via `useMemo` (no AI). Shows selected evidence (strongest matches), omitted evidence (advisory only — not a defect), and warnings in Folio-native list rows. Falls back to "No diagnostics available" copy when draft has no rationale.
3. **Fit summary** — collapsed disclosure in right panel. `buildPackageFitSummary` called via `useMemo` (no AI). Shows the derived verdict+strengths+gaps+positioning text, or `PACKAGE_FIT_SUMMARY_UNAVAILABLE` when rationale is too thin.
4. **Model-tier selects in Generate** — two Folio-native `<select>` elements (`generate-resume-model-tier`, `generate-cl-model-tier`) added to the embedded mode branch of `GenerateTailoredResumeSection` between the context policy card and the Generate button. Use the component's existing `resumeModelTier`/`coverLetterModelTier` state and `setResumeModelTier`/`setCoverLetterModelTier` setters; call `writeStoredResumeModelTier`/`writeStoredCoverLetterModelTier` on change to persist selection. Both disabled while generating.

**Checks run**
- `npx tsx tests/suites/application-package-ux.test.ts` — ✅ 69/69 green (14 new M5b checks)
- `npx tsx tests/suites/app-shell.test.ts` — ✅ 35/35 green
- `npx tsx tests/suites/resume-draft-review.test.ts` — ✅ 21/21 green
- `npx tsc --noEmit` — 0 new errors in changed files (pre-existing test-file TS errors unchanged)
- Pre-existing red (not M5b): `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`

**Known risks**
- Bullet controls only show bullets that have `sourceRefs[0]?.bulletKey` — bullets without a keyed sourceRef (possible in legacy drafts) are silently hidden in the controls panel. This is safe: unkeyed bullets cannot be targeted by the exclusion/force mechanism anyway.
- Forced bullets from excluded experiences use `inventoryBulletKey` from `CollatedBullet`, which is set at runtime by `buildActiveCollatedInventory`. If the inventory is empty or the key is absent, the bullet is skipped. No error — just not shown.

**Suggested git commands**
```bash
git status
git add src/components/pages/OutputEditorPageClient.tsx src/components/setup/GenerateTailoredResumeSection.tsx tests/suites/application-package-ux.test.ts docs/FOLIO_RECOVERY_ROADMAP.md
git commit -m "M5b: line-level bullet controls, tailoring diagnostics, fit summary, model-tier selects in Generate"
```

---

### 2026-06-29 — M5c implementation

**Branch:** `folio-recovery`
**Milestone:** M5c — Cover-Letter Editing, Evidence Staging, Export Gates

**Files changed**
- `src/components/pages/OutputEditorPageClient.tsx` — M5c implementation (manual CL edit, evidence staging, export gate verification)
- `tests/suites/application-package-ux.test.ts` — 18 new M5c checks
- `docs/FOLIO_RECOVERY_ROADMAP.md` — M5c completion log entry, M6 opening prompt, CLI session log

**Behavior changed**
1. **Manual CL edit** — "Edit" button (`cl-edit-toggle`) enters an editable textarea (`cl-edit-textarea`) for the cover letter body. `clIsDirty = body !== coverLetter.body` tracks unsaved changes; `beforeunload` fires while dirty. "Save cover letter" (`cl-save-button`, disabled when `!clIsDirty`) calls `updateGeneratedCoverLetterDraftInCloud` and exits edit mode; "Cancel" resets and exits. Quick-action chips and tone buttons disabled while in edit mode to prevent overwriting unsaved edits. Re-approval invalidation not needed — CL does not gate PDF export.
2. **Pending-only evidence staging** — Collapsible disclosure (`cl-evidence-staging-toggle`). `evidenceRows` memo builds the story spine from `buildActiveCollatedInventory` + `buildAcceptedWordingByBulletKey` + `buildCompanyContext` + `buildEvidenceSpine` → `buildCoverLetterProofEvidenceList` (no AI). Per-row "Use in cover letter" / "Avoid in cover letter" buttons toggle `pendingEvidenceControls`. Summary box shown when controls are staged. Applied on Regenerate only; cleared after success. Staging never calls AI; never auto-saves.
3. **CL export gates verified** — `exportBlocked = overLimit || bannedPhrases.length > 0` already correctly wired from M4.6. Download buttons already gated. No code change required.
4. **Quick-action chips + tone selector verified** — already fully functional from M4.6. No code change required.

**Checks run**
- `npx tsx tests/suites/application-package-ux.test.ts` — ✅ 87/87 green (18 new M5c checks)
- `npx tsx tests/suites/app-shell.test.ts` — ✅ 35/35 green
- `npx tsx tests/suites/resume-draft-review.test.ts` — ✅ 21/21 green
- `npx tsc --noEmit` — 0 new errors in changed files (pre-existing test-file TS errors unchanged)
- `npm run build` — green
- `npm run lint` — 1 pre-existing error in `ProfilePageClient.tsx` unchanged; 0 new errors
- Pre-existing red (not M5c): `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`

**Known risks**
- Evidence rows require a linked job description (`linkedJob`) to compute the spine; if the draft has no associated job, the staging disclosure is not shown. This is correct behavior — no job = no evidence ranking.
- The spine is rebuilt whenever `linkedJob`, `inventory`, `resumeDraft`, `pendingEvidenceControls`, or `coverLetter` change. This is all synchronous pure-function work (no AI) so re-computation is cheap, but in an inventory with many items it could be noticeable. No caching added — acceptable at current scale.

**Suggested git commands**
```bash
git status
git add src/components/pages/OutputEditorPageClient.tsx tests/suites/application-package-ux.test.ts docs/FOLIO_RECOVERY_ROADMAP.md
git commit -m "M5c: CL edit mode, dirty/save/beforeunload, pending evidence staging, export gates verified"
```

---

### 2026-06-29 — M6 implementation

**Branch:** `folio-recovery`
**Milestone:** M6 — Applications Parity

**Files changed**
- `src/components/pages/ApplicationsPageClient.tsx` — full M6 implementation (status edit, notes edit, artifact presence + /output/ links, archive bug fix, saved-job PD, unlinked draft history PD)
- `tests/suites/application-records.test.ts` — 25 new M6 checks (55/55 total)
- `docs/FOLIO_RECOVERY_ROADMAP.md` — M6 completion log entry, M7 opening prompt, CLI session log

**Behavior changed**
1. **Status edit** — Expand any application row to see an inline status `<select>` (EDITABLE_APPLICATION_RECORD_STATUSES; excludes "archived"). Selecting a different value immediately calls `updateApplicationRecordInCloud({ status })` and updates local state.
2. **Notes edit** — Expand any application row to see a textarea pre-populated from the stored notes; "Save notes" calls `updateApplicationRecordInCloud({ notes })`. State tracked per-record in `notesDraftById`.
3. **Artifact presence labels** — New "Artifacts" column shows resume ✓/— and cover letter ✓/✗/— per row using `formatApplicationArtifactSummary`. Expanded details shows labeled links to `/output/[draftId]` for resume draft and cover letter (if present).
4. **Open-package link** — Eye icon in Actions column now links to `/output/[draftId]` (was `/resume-preview/[id]`). Expanded details has explicit "Resume draft" and "Cover letter" links also targeting `/output/`.
5. **Archive bug fixed** — The "Archived" tab was always empty: `listApplicationRecordsFromCloud()` omits archived records by default, so they never loaded. Fixed by loading with `{ includeArchived: true }` and updating `filterApplications("all")` to exclude archived (`status !== "archived"`). Archive action now updates local state in-place (`status: "archived"`) so the record moves to the Archived tab immediately. Archive-without-delete semantics unchanged.
6. **Saved-job management PD** — `<details>` disclosure (`saved-jobs-disclosure`) below the table. Loads `listJobDescriptionsFromCloud()` and shows active applications with a linked JD — each with JD summary preview and "Re-use on Generate" link to `/generate?jobId=[id]`. Hidden when no linked JDs exist.
7. **Unlinked draft history PD** — `<details>` disclosure (`unlinked-drafts-disclosure`) below the table. Shows resume drafts with no `applicationId`, using `buildDraftListDisplays` for labels; each row links to `/output/[id]`. View only. Hidden when no unlinked drafts exist.

**Checks run**
- `npx tsx tests/suites/application-records.test.ts` — ✅ 55/55 green (25 new M6 checks)
- `npx tsx tests/suites/app-shell.test.ts` — ✅ 35/35 green
- `npx tsc --noEmit` — 0 new errors in `ApplicationsPageClient.tsx`; all other TS errors are pre-existing test-file errors
- `npm run lint` — 0 new errors; 1 pre-existing error in `ProfilePageClient.tsx` unchanged
- `npm run build` — ✅ green
- Pre-existing red (not M6): `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`, 1 TS error in `application-records.test.ts` (readonly tuple `.includes()` type narrowing — pre-existing, shifted from line 78 → 82 by test additions)

**Known risks**
- Loaded job descriptions include all JDs the user has ever created; for users with many JDs and many applications, the `jobById` Map lookup is O(1) so performance is fine. No pagination needed at current scale.
- The saved-job PD section only shows applications whose `jobDescriptionId` is found in `jobById` (i.e., the JD still exists in Supabase). If a JD was deleted externally, that application's row is simply not shown in the PD section.
- Archive state update is optimistic (local state updated before backend confirms). The `archiveApplicationRecordInCloud` call can fail silently if the user closes the tab immediately after; this is consistent with the M3 archive behavior.

**Suggested git commands**
```bash
git status
git add src/components/pages/ApplicationsPageClient.tsx tests/suites/application-records.test.ts docs/FOLIO_RECOVERY_ROADMAP.md
git commit -m "M6: status edit, notes edit, artifact links /output/, archive fix, saved-job PD, unlinked draft PD"
```

---

### 2026-06-29 — M7 implementation

**Branch:** `folio-recovery`
**Milestone:** M7 — Secondary Surfaces & Stub Cleanup

**Files changed**
- `src/app/onboarding/page.tsx` — wired upload step: `parseDocxResume` + `upsertResume` + `saveResumeInventoryToCloud`; status messages; "Skip for now" path; step-3 success/error notice
- `src/types/application-record.ts` — added `"interview"` to `APPLICATION_RECORD_STATUSES`
- `src/components/pages/ApplicationsPageClient.tsx` — `filterApplications("interview")` now returns real records instead of `[]`
- `src/app/(workspace)/settings/page.tsx` — converted to client component with read-only account info (email + profile name/role) and preferences "coming soon" section
- `src/components/app/TopBar.tsx` — removed dead notification bell; avatar wired as `<Link href="/profile">`
- `src/components/pages/CareerVaultPageClient.tsx` — removed dead "Add bullet point" ghost button
- `src/app/(workspace)/resume-preview/[draftId]/page.tsx` — replaced with `notFound()`
- `src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx` — replaced with `notFound()`
- `src/app/(workspace)/cover-letter-preview/[draftId]/page.tsx` — replaced with `notFound()`
- `docs/FOLIO_REDESIGN.md` — routes table and contract note updated to reflect preview route retirement
- `docs/FOLIO_RECOVERY_ROADMAP.md` — M7 completion log entry, M8 opening prompt, CLI session log

**Behavior changed**
1. **Onboarding upload** — step 2 now truly parses and saves the file: `parseDocxResume(file)` extracts structured inventory data; `upsertResume` merges it into a fresh inventory; `saveResumeInventoryToCloud` persists it. Only `.docx` accepted (non-.docx shows an honest error). "Skip for now" advances to profile without saving. Success path: step 3 shows green notice. Error path: step 3 shows grey notice with Career Vault fallback direction.
2. **Interview tab** — the Interview tab at `/records` now shows application records with `status === "interview"`. The `"interview"` status was added to `APPLICATION_RECORD_STATUSES` (between `"applied"` and `"rejected"`) and to the derived `EDITABLE_APPLICATION_RECORD_STATUSES`, so it is also available in the inline status `<select>`.
3. **Settings** — `/settings` shows the user's email (from auth session) and profile name + target role (from Supabase `profiles` table), read-only. A "Preferences — coming soon" section replaces the empty placeholder.
4. **Landing redirect (D6)** — already complete in middleware (`isRootPath && hasSession → redirect /dashboard`). Verified, no code change.
5. **TopBar** — notification bell removed (no system behind it). Avatar button wired as a `<Link>` to `/profile` — previously a dead `<button>` with no handler.
6. **"Add bullet point"** — ghost button in Career Vault work-experience panel removed. There is no structured add-bullet flow at the Vault panel level; adding bullets belongs to the structured editor in `/output`.
7. **Preview routes retired** — `/resume-preview/[draftId]`, `/resume-preview/[draftId]/edit`, and `/cover-letter-preview/[draftId]` all return `notFound()`. Their behavior was fully absorbed by `/output` in M5a (structured editing + PDF preview) and M5c (CL editing). `FOLIO_REDESIGN.md` updated.

**Checks run**
- `npx tsx tests/suites/app-shell.test.ts` — ✅ 35/35 green (preview routes no longer import forbidden legacy clients)
- `npx tsx tests/suites/application-records.test.ts` — ✅ 55/55 green
- `npx tsc --noEmit` — 0 new errors in any changed source file; pre-existing test-file TS errors unchanged
- `npm run lint` — 0 new errors; 1 pre-existing error in `ProfilePageClient.tsx` unchanged
- `npm run build` — ✅ green
- Pre-existing red (not M7): `resume-generation-validation.test.ts` (3 fails), `draft-inventory-safety.test.ts` (2 fails), 1 lint error in `ProfilePageClient.tsx`, 1 TS error in `application-records.test.ts` (readonly tuple `.includes()` type narrowing — now reflects updated union including "interview")

**Known risks**
- Onboarding upload uses `saveResumeInventoryToCloud` which upserts over any existing inventory for the user. If a user somehow reaches onboarding a second time with an existing inventory, the new upload will merge into the existing one (via `upsertResume` by filename) — not replace it. This is intentional and consistent with Career Vault upload behavior.
- `parseDocxResume` is a client-side parser; it will reject non-docx files (explicitly guarded) and may produce partial results for malformed docx. Parse failures are surfaced honestly and the user is directed to Career Vault after setup.
- Settings page reads from `profiles` table client-side; if the profile row doesn't exist yet (user skipped onboarding step 3 somehow), it shows "—" for name and role — honest and safe.

**Suggested git commands**
```bash
git status
git add src/app/onboarding/page.tsx src/types/application-record.ts src/components/pages/ApplicationsPageClient.tsx src/app/(workspace)/settings/page.tsx src/components/app/TopBar.tsx src/components/pages/CareerVaultPageClient.tsx "src/app/(workspace)/resume-preview/[draftId]/page.tsx" "src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx" "src/app/(workspace)/cover-letter-preview/[draftId]/page.tsx" docs/FOLIO_REDESIGN.md docs/FOLIO_RECOVERY_ROADMAP.md
git commit -m "M7: status edit, notes edit, artifact links /output/, archive fix, saved-job PD, unlinked draft PD"
```
