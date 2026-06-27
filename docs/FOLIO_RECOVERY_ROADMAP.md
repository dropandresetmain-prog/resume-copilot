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
| C6 | Model tiers treated as settled | `enhanced` = `gemini-3-flash-preview`, `premium` = `gemini-3.5-flash` are likely non-stable IDs → silent fallback. Investigate Now before exposing tier selection in Folio. |
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
| Onboarding resume upload + parse | Vault | decorative in onboarding step 2 | High — user thinks resume loaded | **INV → KV/MERGE** (`D3`) |
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
| AI enrichment review | EnrichmentReviewPanel | **Missing** (`D2`) | Med | Med | **PD** |
| Duplicate cleanup | InventoryDuplicateCleanupPanel | **Missing** | Med | Med | **PD** |
| Project-pollution cleanup | InventoryProjectCleanupPanel | **Missing** | Low-Med | Med | **PD** |
| Source-resume / parsed-debug audit | SourceResumesView | **Missing** | Low | Low | **PD/BE** |
| "Add bullet point" button | — | dead button (`S4`) | — | — | **REMOVE or wire** |
| Full Inventory CRUD | — | parked | — | — | **PARK** (v0.10.0) |

### Generate (`/generate`)

| Capability | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|
| Company/role/JD intake + metadata extract | `NewApplicationPageClient` + embedded `GenerateTailoredResumeSection` | High | **KV** |
| Saved-job save/reuse/duplicate handling | Engine present; UI surfacing INV | Med | **KV / INV** |
| Context-policy visibility (JD-only vs website+JD vs confidential) | Engine present; copy surfacing INV | Med (stale research leak) | **KV** |
| Website discovery (Firecrawl, billable) | `CompanyWebsiteDiscoveryPanel` kept | Med | **PD** |
| Output mode (resume / resume+CL) | Present | Low | **KV** |
| AI step cost estimate | Present | Low-Med | **KV** |
| Partial-failure recovery (CL fails, resume kept) | Engine present (`0877eb2` hardens) | **High** | **KV** |
| Model-tier selector | `ModelTierSelect` kept | Low | **PD / INV** (unstable IDs, C6) |
| Cover-letter-only mode | disabled | — | **PARK** |

### Output — Resume (`/output/[draftId]`)

| Capability | Old location (reference only) | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|---|
| Persisted resume load + reload-by-URL | ResumePreview | Present | High | **KV** |
| **Approve-for-export sequence** | ApplicationReviewCenter | **Missing** | Critical | **KV** |
| **Server one-page PDF gate (Puppeteer, 422 block)** | `/api/approve`, `/api/validate` | **Missing in UI** | Critical | **KV** |
| Export-fit reconciliation (browser vs server, fix suggestions) | ExportFitStatusPanel | **Missing** | High | **PD** |
| PDF/DOCX export (approved, structured filenames) | export routes | Downloads present; **gate missing** | Critical | **KV** |
| Repair banner (`needs_review`) | ResumePreview | **Missing** | High | **KV** |
| Structured section/header editing + dirty/beforeunload + re-approval invalidation | ResumeDraftReviewWorkspace | **Missing** | High | **PD** |
| Resume revision queue (batch scoped) | ResumeStagedCustomRevisionPanel | **Missing** | Med | **PD** |
| Evidence controls (exclude/force/rewrite/regenerate, pending queue) | ResumeEvidenceRegenerationPanel | Partial (toggles) | Med-High | **PD** |
| Tailoring diagnostics (selected/omitted/proof/warnings) | PackageTailoringDiagnosticsPanel | **Missing** | Med | **PD** |
| Fit summary | PackageFitSummaryPanel | **Missing** | Med | **PD** |
| Layout sliders | layout controls | **Missing** | Low-Med | **PD** |

### Output — Cover Letter (`/output` CL tab + `/cover-letter-preview`)

| Capability | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|
| Load CL by resume draft id; failed-load ≠ absent | Present + hardened by `0877eb2` | High (duplicate drafts) | **KV** |
| Manual edit + dirty/save/beforeunload | Partial | Med | **KV** |
| Quick revision chips + candidate preview accept/reject | Partial (`CoverLetterStagedRevisionPanel`) | Med | **PD** |
| Pending-only evidence staging (use/avoid proof) | `CoverLetterEvidenceRegenerationPanel` kept | Med | **PD** |
| Full regenerate in place | Engine present | Med | **KV** |
| Export PDF/DOCX (420-word + banned-phrase gate) | Buttons kept; gate INV | High | **KV** |
| Secondary formats (email/LinkedIn/DM/WhatsApp) | `SecondaryCommunicationsPanel` kept | Low | **PD** |
| Schema-constrained CL Gemini output (`56bc7c5`) | Codex-only | Med | **PORT (BE)** |

### Applications (`/records`)

| Capability | Old (reference only) | Folio counterpart | Risk if omitted | Rec |
|---|---|---|---|---|
| Persisted records table + filters | RecordsPanel | `ApplicationsPageClient` present | High | **KV** |
| Status edit + notes | ApplicationRecordsPanel | **Missing** (`D1`) | Med | **KV** |
| Artifact presence/missing labels + open package/CL | RecordsPanel | Partial | Med | **KV** |
| Archive-without-delete | RecordsPanel | Present (`archiveApplicationRecordInCloud`) | Med | **KV** |
| Saved-job management | JDInputPanel | **Missing** | Low-Med | **PD** |
| Unlinked draft history + delete/export | DraftHistoryPanel | **Missing** | Low | **PD** |
| "Interview" filter | — | stub `return []` (`S2`) | — | **REMOVE or add status** |

### Profile / Settings / Secondary

| Capability | Folio counterpart | Rec |
|---|---|---|
| Communication Profile (tone/voice) | `ProfilePageClient` present | **KV / SIMPLIFY** |
| Settings | stub (`S1`) | **SIMPLIFY** — minimal account + prefs, or hide |
| Dev Tools | `notFound()` in prod | **KV (gated)** |
| TopBar avatar/notifications | decorative (`S3`) | **REMOVE/PARK** |

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
| **M5a** | Output: structured edit + revision queue | Editing depth after core trust proven | Med |
| **M5b** | Output: evidence controls + tailoring diagnostics + fit summary | PD depth | Med-High |
| **M5c** | Cover-letter editing, evidence staging, export gates | CL trust closure | Med |
| **M6** | Applications parity | Closes `D1` | Med |
| **M7** | Secondary surfaces & stub cleanup | Honesty pass | Low-Med |
| **M8** | Authenticated E2E closure | Proves parity | — |

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
- **Dependencies:** M2, M3 (Generate must produce trustworthy drafts before Output approval is tested end-to-end).
- **Independent Opus review before merge: required.**

---

### M5a — Output: Structured Edit + Revision Queue

- **Objective:** Editing depth after core trust proven.
- **Outcome:** Structured section/header edit with dirty/beforeunload + re-approval invalidation; resume revision queue (batch scoped, Accept all / Reject all).
- **Stays mounted:** `OutputEditorPageClient`.
- **References:** `ResumeDraftReviewWorkspace` (`packageMode`), `ResumeStagedCustomRevisionPanel`.
- **Must not change:** staging never calls AI; no page-load AI.
- **Tests:** extend `resume-draft-review`, `forced-bullet-regeneration`.
- **Dependencies:** M4.

---

### M5b — Output: Evidence Controls + Tailoring Diagnostics + Fit Summary

- **Objective:** Restore PD depth for evidence tailoring.
- **Outcome:** Exclude/force/rewrite/regenerate pending queue wired; tailoring diagnostics panel reading saved spine snapshot (no page-load AI); fit summary from saved rationale.
- **Stays mounted:** `OutputEditorPageClient`.
- **References:** `ResumeEvidenceRegenerationPanel`, `PackageTailoringDiagnosticsPanel`, `PackageFitSummaryPanel`.
- **Must not change:** no page-load AI for diagnostics; staging never auto-saves.
- **Tests:** extend `application-package-ux`, `forced-bullet-regeneration`.
- **Dependencies:** M5a.

---

### M5c — Cover-Letter Editing, Evidence Staging, Export Gates

- **Objective:** CL trust closure.
- **Outcome:** Manual CL edit + dirty/save/beforeunload; pending-only evidence staging applied on regenerate only; export gates (420-word + banned-phrase) enforced in Folio UI.
- **Stays mounted:** `OutputEditorPageClient` (CL tab), `/cover-letter-preview` editor.
- **References:** `CoverLetterPreviewPageClient`, `CoverLetterEvidenceRegenerationPanel`, `CoverLetterStagedRevisionPanel`.
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

- **Outcome:** Onboarding upload made real or redirected (`D3`); interview filter removed or status added (`S2`); settings minimal-real or hidden (`S1`); landing signed-in redirect (`D6`); dead buttons wired/removed.
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

## 10. Safeguards Against Another Legacy-UI Restoration

1. **Route-contract tests (land in M1):** assert each active route renders its Folio client. A source-grep contract in `app-shell.test.ts` is the model.
2. **Forbidden-remount rule (document in `FOLIO_REDESIGN.md`):** `InventoryPageClient`, `RecordsPageClient`, `GeneratePageClient`, `ResumePreviewPageClient`, `CoverLetterPreviewPageClient` must not be imported by any `page.tsx`. Test asserts this.
3. **Capability-level behavior tests** for each restored slice (extraction≠save, one-page gate blocks, approval invalidation, partial-failure preserves resume).
4. **Milestone stop rule:** each milestone names one Folio client that stays mounted; if a plan proposes swapping a route or importing a legacy client, stop and re-scope.
5. **Independent Opus review before merge** for M4, M5b; review brief + diff only; no implementation history.
6. **Screenshot + responsive QA** and **authenticated direct-reload testing** for every UI milestone.
7. **Source-of-truth/persistence tests** retained (`draft-inventory-safety` is the model).
8. **Documentation separates behavior from presentation:** `FOLIO_REDESIGN.md` owns presentation/routes; `HANDOFF.md`/`KNOWN_ISSUES.md` own behavior.

---

## 11. Model & Effort by Stage

| Stage | Model | Effort | Reasoning |
|---|---|---|---|
| Product/capability planning and cross-cutting architecture decisions | Opus | High | Requires full context across all three systems; wrong decisions cascade across milestones |
| M1 — Foundation lock, route-contract safeguards, backend ports | Opus | Medium | Small line count but crosses schema (CL response constraint), persistence (load-failure trust), and the safeguard harness simultaneously; high consequence per line |
| M2 — Career Vault minimum parity | Sonnet | Medium | Bounded page work; persistence touches `InventoryEdits` and `resume_inventories`; real UI complexity in edit/restore/extract flows |
| M3 — Generate minimum parity | Sonnet | Medium | Mostly verification + small surface adds; orchestration state touches generation engine |
| M4 — Output core delivery | Opus | High | Crosses approval + export + server gate + persistence trust; highest data-integrity risk in the milestone set; independent review required |
| M5a — Output: structured edit + revision queue | Sonnet | Medium | Well-understood pattern (dirty state, beforeunload, staged accept/reject); re-approval invalidation is the sensitive path |
| M5b — Output: evidence controls + tailoring diagnostics + fit summary | Sonnet | High | Complex pending-queue semantics, PD surface decisions, diagnostic reads from spine snapshot; must not introduce page-load AI |
| M5c — Cover-letter editing, evidence staging, export gates | Sonnet | Medium | CL gate + pending-only staging are well-specified; primary work is UI mapping and gate wiring |
| M6 — Applications parity | Sonnet | Low | Re-implementing status/notes/artifact links inside existing `ApplicationsPageClient`; no schema changes |
| M7 — Secondary surfaces & stub cleanup | Sonnet | Low | Mechanical: remove stubs, wire real flows, add redirect |
| M8 — Authenticated E2E closure | Sonnet (assist) | Low | Human-led; Claude assists from observations and screenshots only |
| Independent milestone review (M4, M5b) | Opus (fresh session) | Low | Review brief + diff only; fresh context; no implementation history |

---

## 12. Risk Register

### Act Now

- No route-contract test exists → another one-line swap could recur silently. (M1)
- Output Editor ships exports without the server one-page gate visible → users can believe a multi-page resume is export-ready. (M4)
- Onboarding upload is decorative (`D3`) → user believes their resume loaded. Flag in docs immediately; fix in M7.

### Investigate Now

- `profiles` migration applied to the live Supabase project? (runtime, not repo)
- Model-tier IDs `gemini-3-flash-preview` / `gemini-3.5-flash` stability (C6) before exposing tier UI.
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

### M5a Opening Prompt

```
Implement Milestone M5a — Output: Structured Edit + Revision Queue — for Resume Copilot (Folio).

CONTEXT: Read docs/FOLIO_RECOVERY_ROADMAP.md in full before doing anything else. It is the source of truth. M1–M4 are complete. Read the M4 Milestone Completion Log row and §9 "M5a — Output: Structured Edit + Revision Queue".

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

STAYS MOUNTED: OutputEditorPageClient.

REFERENCES (read only — behavioral reference, never mount): ResumeDraftReviewWorkspace (packageMode), ResumeStagedCustomRevisionPanel, and ResumePreviewPageClient's structured editor + markLayoutChangedAfterApproval invalidation path.

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

*(To be written by the M5a implementation chat upon closing.)*

### M5c Opening Prompt

*(To be written by the M5b implementation chat upon closing.)*

### M6 Opening Prompt

*(To be written after M5c.)*

### M7 Opening Prompt

*(To be written after M6.)*

### M8 Opening Prompt

*(To be written after M7.)*

---

## 14. Milestone Completion Log

| Milestone | Status | Completed | Notes |
|---|---|---|---|
| M1 — Foundation lock, route-contract safeguards | ✅ Complete | 2026-06-28 | Cherry-picked `56bc7c5` + `0877eb2` (clean, sit directly on `7aec1d0`); added 10 route-contract + forbidden-remount checks to `app-shell.test.ts` (scoped to 5 active routes); refreshed 9 stale pre-Folio shell assertions to the Folio shell; verified sign-out / signup→confirm-email / profiles migration (no behavior change); documented the forbidden-remount rule + fixed a stale route table in `FOLIO_REDESIGN.md`. **Pre-existing red carried forward (not M1):** `resume-generation-validation` (3 fails, generation-semantics area — forbidden to touch in M1); lint has 2 pre-existing errors in untouched files (`ProfilePageClient.tsx`). `npm run build` green; M1 suites green when run directly. |
| M2 — Career Vault minimum parity | ✅ Complete | 2026-06-28 | DOCX upload dialog keeps open while parsing and shows explicit saved/partial/failed states from inventory diff (no silent bad parse); revert-to-original per bullet clears `editedBulletTextByBulletKey` overlay (source resumes never touched); save error surfaced in `inventory-unsaved-changes-banner`; `InventoryTextExtractionPanel` wired with `onSaveApplied` only on Apply (extract≠save confirmed); `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel` brought into `CareerVaultPageClient` under "Vault management tools" progressive-disclosure section — legacy clients never mounted. New checks added to `inventory-edits`, `inventory-text-extraction`, `inventory-duplicate-cleanup`, and `draft-inventory-safety` suites. **Pre-existing red carried forward (not M2):** `resume-generation-validation` (3 fails); `draft-inventory-safety` (`updateGeneratedResumeDraftInCloud` / `deleteGeneratedResumeDraftFromCloud`, 2 fails); lint errors in `NewApplicationPageClient.tsx` + `ProfilePageClient.tsx` (2 errors, all untouched files). Build green; M2 suites green when run directly. |
| M3 — Generate minimum parity | ✅ Complete | 2026-06-28 | Saved-job match banner added to `NewApplicationPageClient`: live detection via `findDuplicateJobDescription` + `normalizeJobDescriptionInput`; "Reuse saved job" fills form + sets `editingJobId`; "Start fresh" dismisses per-match. Context policy summary (headline + detail, `data-testid="generate-context-policy-summary"`) added to `embeddedMode` path of `GenerateTailoredResumeSection` so users see JD-only vs website+JD vs confidential before clicking Generate. Partial-failure recovery (resume preserved, "Retry Cover Letter" offered, retry skips resume API) was already complete — confirmed by full `generation-partial-failure` suite pass. 4 new checks added to `generate-flow.test.ts`. Fixed 2 pre-existing lint errors in `NewApplicationPageClient.tsx` (unescaped apostrophe + unused `signInRequiredReason`). **Pre-existing red carried forward (not M3):** `resume-generation-validation` (3 fails); `draft-inventory-safety` (2 fails); lint in `ProfilePageClient.tsx` (1 error). Build green; M3 suites green. |
| M4 — Output core delivery | ✅ Complete | 2026-06-28 | All surfacing landed in `OutputEditorPageClient.tsx` (the only client touched) — backend approve/validate/export gate was already complete and correct, so **no route/schema/engine changes**. Added a dedicated **Review and export** card (`data-testid="output-approve-export"`) at the top of the Resume tab implementing the explicit two-step **Approve → Export** flow: Approve calls `approveResumeDraftForExport` (`/api/approve/resume-draft`), which server-validates one page and persists `status="approved"` + `serverPdfValidation`; export unlocks only when `exportReady` (approved + `serverPdfValidation.pageCount === 1` + layout equal). **Server one-page hard gate (422)** surfaced via `ResumePdfOnePageBlockedError` + `formatOnePageBlockedMessage` as an actionable block (`output-one-page-block`) listing server `suggestedActions` — never silent. PDF/DOCX export wired through the existing `exportResume*FromApi` + `deliverExportedFile` (structured filenames + private storage unchanged); **topbar exports gated** (`isExportingPdf \|\| !exportReady`) so there is no visual bypass. **needs_review banner** (`output-needs-review-banner`, banner-only per scope decision) shown before the approve CTA. **Post-approval invalidation** wired to Regenerate (clears `validationFailure`; fresh content downgrades status) — structured-edit invalidation deferred to M5a. **Failed-load vs confirmed-missing honesty**: load effect now distinguishes `loadFailed` (retryable, `output-load-failed`) from `notFound`, with the company-context fetch isolated so a context failure never masquerades as a missing draft. Mark-as-sent left untouched. Checks added to `resume-approve-validation`, `resume-pdf-page-count`, `resume-export-delivery`, `application-package-ux`; `/output` route-contract + forbidden-remount stay green. **Pre-existing red carried forward (not M4):** `resume-generation-validation` (3 fails); `draft-inventory-safety` (`updateGeneratedResumeDraftInCloud` / `deleteGeneratedResumeDraftFromCloud`, 2 fails); 1 lint error in `ProfilePageClient.tsx` (untouched). Build green; M4 suites green when run directly. **Independent Opus review required before merge.** |
| M5a — Output: structured edit + revision queue | Not started | — | — |
| M5b — Output: evidence controls + diagnostics + fit summary | Not started | — | — |
| M5c — Cover-letter editing + evidence + export gates | Not started | — | — |
| M6 — Applications parity | Not started | — | — |
| M7 — Secondary surfaces & stub cleanup | Not started | — | — |
| M8 — Authenticated E2E closure | Not started | — | — |
