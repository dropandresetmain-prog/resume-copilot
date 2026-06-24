# HANDOFF

## Current version

**v0.9.13C** (code)

## v0.9.13C implementation note

Package Review Workspace Decision Tree: Application Package is the central post-generation hub with staged changes and deliberate apply actions.

**Decision tree:** Review workflow panel with Edit resume text, Fix resume evidence, Adjust resume layout, Revise cover letter, Approve for export. Readiness checklist replaces ambiguous "reviewed" language.

**Structured resume editor on package:** Form fields for header/contact, summary, experience, education, skills, additional experience. Desktop edit + live PDF preview; mobile Edit / Preview / Layout tabs. Save resume edits downgrades approval (`layout_changed`) when previously approved.

**Evidence queue:** Stage remove / add / exclude; summary before apply; Apply evidence changes once. Local removes avoid Gemini; adds use targeted rewrite. Full regenerate is last resort.

**Cover letter staged revision:** Instruction chips + custom notes; single Revise cover letter AI call; preview accept/reject before persist.

**AI fit summary:** ≤100 words derived from saved `rationale.overall` + `calculateFitScore()` — no page-load AI. No schema change.

**Preview/export trust:** Honest copy when browser preview fits one page but server validation blocks; mismatch banner after failed approve.

## v0.9.13B implementation note

Post-Generation Save + Edit Workflow Repair: clearer save models and fix paths without full redesign.

**Resume text editor:** Persistent CTA renamed to "Save resume edits" (no longer "Mark as reviewed"). Dirty/saving/saved status strip, beforeunload warning, card-level "Apply local edit" clarifies preview vs persist.

**Application Package:** Targeted fix actions (Fix resume text, Fix evidence, Fix cover letter, Adjust layout) shown before approve/export. `#package-edit` auto-opens evidence panel.

**Evidence/regeneration:** Include vs exclude evidence copy; rewrite button shows affected role count when available.

**Cover letter:** Split Manual edit (Save changes when dirty) vs AI revision (saves immediately). Manual save not primary without unsaved changes.

**Parked:** forced evidence pending change queue, cover letter version history/undo, deeper package redesign.

## v0.9.13A implementation note

Inventory Cleanup + Bullet Control Baseline: deterministic duplicate/variant detection within the same role, user cleanup controls stored in existing `InventoryEdits` overlay (no schema change), and clearer regeneration wording (include/exclude evidence, rewrite affected roles vs full regenerate).

**Duplicate detection:** `detectInventoryDuplicateGroups` — shared metrics, keyword overlap, normalized text similarity. No Gemini, no auto-delete.

**User controls:** Keep one / Hide from generation / Keep both / Mark alternate wording. Resolutions persist via `hiddenBulletKeys` + `dismissedDuplicateGroupIds` + optional `alternateWordingBulletKeys`.

**Generation:** Hidden bullets already excluded via `buildActiveCollatedInventory` — unchanged pipeline path.

**Parked:** full Inventory CRUD, AI merge of duplicates, bullet version history, server idempotency, recruitment/confidential mode.

## v0.9.12E implementation note

AI Call Cost Guardrails: practical visibility and control without redesigning the AI architecture.

**Generate UX:** Pre-run AI step estimate (1 resume / 2 resume+cover letter / 3 + website fetch with research). Visible website research toggle (use when website provided vs JD-only for this run). Recruitment checkbox copy clarifies future JD-only behavior without claiming it works today.

**Server observability:** `callGeminiWithRetry` logs structured `[gemini-call]` metadata (logical step, tier, model, attempts, fallback, error reason) — no prompts or secrets.

**Regeneration copy:** Forced-bullet panel buttons note targeted rewrite vs full regenerate scope.

**Not in scope (documented):** durable AI job ledger, server idempotency, hiding retry/compression extra calls from estimates.

Runtime constraints held: no Supabase schema changes, no model ID changes, no generation quality semantics changes, no provider architecture rewrite.

## v0.9.11G implementation note

Mobile Nav + Alert Fatigue Fix addresses v0.9.11F browser QA: stacked mobile nav (logo row + full-width scroll links — no RC/Generate collision), collapsible compact storage warnings on Generate/Uploads/Applications, tighter page headers, and quieter readiness notices so the Generate composer and CTA appear sooner.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval behavior changes, no model ID changes, and no route changes.

## v0.9.11F implementation note

Visual + Flow Correction addresses hands-on user feedback that the app felt too much like internal admin software. Delivers a startup-style landing hero, premium product-led shell nav (Generate as early primary CTA), composer-first Generate layout with centered CTA and quieter base-resume row, dynamic generation progress, upload summary/list fixes, and compact expandable Applications cards with rollup stats.

Recruitment firm / confidential client posting checkbox is UI-only (disabled, coming soon) — no generation behavior change. Inventory duplicate/bullet variant cleanup remains a separate milestone.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval behavior changes, no model ID changes, and no route changes.

## v0.9.11E implementation note

Live Package/Cover Letter UX Fixes closes four user-visible defects found in audit: (1) mojibake `Saving…` text in the Cover Letter editor, (2) the Application Review Center now always provides a cover letter fix path — "Edit cover letter" when one exists, "Go to cover letter" anchor when missing, (3) the package sticky rail no longer renders the "Research" anchor when no company context exists, (4) the Cover Letter editor save model is clarified — Save changes is primary only when Raw Text is active or unsaved changes exist, export actions are visually secondary, and the helper copy now accurately states that quick revisions are saved automatically.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval behavior changes, no model ID changes, and no route changes.

## v0.9.11D implementation note

Action Placement and Workflow Surface Redesign is the latest code milestone. It keeps the v0.9.11C shell and route structure, but separates primary, secondary, export, edit, revision, notes, and destructive action lanes across Generate, Application Package, Cover Letter, Applications, and saved-job surfaces.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval behavior changes, no model ID changes, and no source-of-truth changes. Recruiter/confidential-client mode, force-exclude semantics, internship ranking policy, and Inventory CRUD remain parked/follow-up.

## v0.9.11C implementation note

UI/UX Redesign Foundation is the latest code milestone. It delivers a broader visual and structural pass across the existing routes while preserving runtime behavior: premium framed workspace shell and sticky nav, stronger page headers/cards/buttons/tabs, cleaner A4 preview frames, Uploads readiness layout, CRUD-ready Inventory sections, composer-first Generate, Applications-first Records page, Application Package section rail/review-export focus, and clearer Resume Edit/Cover Letter/Profile editor surfaces.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval behavior changes, no model ID changes, and no source-of-truth changes. Recruiter/confidential-client mode, force-exclude semantics, internship ranking policy, and Inventory CRUD remain parked/follow-up.

## v0.9.11I implementation note

Package First Viewport + Mobile CTA/Nav Polish: narrow follow-up to v0.9.11H addressing first-viewport hierarchy, mobile nav clipping, and Generate CTA placement. Key changes: (1) Application Package page is now a two-column layout on desktop — compact sticky action rail (review/approve/export) in left 20rem column, resume PDF preview immediately visible as dominant right column; section rail removed; (2) review center Approve→Export grid changed to single-column stack for narrow sidebar fit; (3) mobile nav replaced with compact 5-item `grid-cols-5` — no horizontal scroll, no clipping, "Applications" shortened to "Apps" on mobile, Generate remains visually primary; (4) Generate JD textarea height reduced on mobile via responsive CSS (`h-[6.5rem] sm:h-auto`); (5) sticky bottom Generate CTA bar added on mobile only, mirrors main action with same disabled guard; (6) JD panel description shortened.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval logic changes, no model ID changes, no route changes.

## v0.9.11H implementation note

Application Package Guided Review + Generate Composer Density: addresses post-generation UX failures identified in screenshot audit. Key changes: (1) new `DRAFT_READY` status for fresh drafts — neutral cyan banner instead of red "Not Ready to Export"; (2) explicit two-step Approve → Export sequence with step labels and sequential emphasis; (3) review checklists collapsed behind "Review details (N)" disclosure so the review card is no longer a blocking wall above the resume; (4) compact package page header; (5) Generate composer density — base resume + CTA appear directly after the JD textarea, optional company/role/URL/recruitment fields collapsed behind "Job details (optional)"; (6) single compact readiness strip replacing 4–5 scattered amber/red notices on Generate; (7) mobile nav right-edge fade affordance.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval logic changes, no model ID changes, no route changes.

## v0.9.12D implementation note

Restore Generate Company and Role Primary Fields: bugfix restoring Company and Target role as visible primary composer fields on Generate (above JD textarea). Recruitment checkbox stays near Company (disabled/UI-only). Advanced options collapse contains only Job URL and Clear form. No generation/persistence/schema changes.

## v0.9.12C implementation note

Import Robustness + Output Polish Defaults: parser follow-up to v0.9.12B demo blockers plus default output tuning.

**Import robustness:** (1) inline experience comma disambiguation via company-like suffixes vs role-like terms; ambiguous pairs downgrade confidence and warn; (2) date-first descriptor skip (Full-time, Remote, etc.); (3) title-case unparsed sections (Summary, Professional Summary, Profile, Objective, References).

**Output polish defaults:** (1) resume wrapped line spacing default `1.08` → `1.12` via `PREVIEW_LINE_SPACING_DEFAULT` (preview, PDF, DOCX share `document-model` / `resume-layout-styles` source of truth); (2) cover letter generation/revision prompts strongly avoid em dashes and inflated corporate/AI wording while preserving v0.9.12A candidate-name generalization and existing letter structure.

Runtime constraints held: no Supabase schema changes, no generation/export approval mechanics changes, no new model calls, two-line-column profile unchanged.

## v0.9.12B implementation note

General DOCX Resume Import Baseline: broadens DOCX parsing to handle common non-founder resume layouts. Key changes: (1) section detection — added "Employment History", "Professional History" aliases for work experience; "Certifications", "Achievements", "Awards", "Honors", "Publications", "Activities" mapped to additional_experience; "Key Skills", "Core Competencies", "Competencies", "Skill Set", "Areas of Expertise", "Technologies", "Tools & Technologies" mapped to skills; "Qualifications", "Academic History", "Education & Training" mapped to education; (2) new inline experience parser profile — handles "Role at Company — Date", "Role | Company | Date", and comma-separated "Role, Company, Date" single-line formats; also handles date-first blocks ("Date\nRole, Company"); registered alongside two-line-column profile, score-wins selection picks best result; (3) skills section — plain comma/semicolon-separated lines now split into individual `other` items; bullet-list skills stripped of prefix and split; custom labeled lines (e.g. "Programming: Python, SQL") parsed into technicalSkills; (4) profile/contact parser confirmed generic — no hardcoded name patterns; (5) all new behavior tested in existing suites (parser.test.ts and section-detection.test.ts); original two-line-column reference tests unchanged.

Runtime constraints held: no Supabase schema changes, no generation/export behavior changes, no PDF import, no AI/LLM parsing, no new test scripts.

## v0.9.12A implementation note

Remove Founder Identity From AI/Export Pipeline: critical generalization milestone removing founder-specific hardcoding from production AI behavior. Key changes: (1) cover letter prompt now uses dynamic `candidateName` from resume draft header (falls back to "the candidate" / "[Candidate Name]" closing — never "Min Htet"); (2) rule 7 generalized — "Do NOT describe the candidate as a software engineer unless evidence clearly supports it"; (3) cover letter validation no longer requires "Min Htet" signature — validates against `candidateName` when provided, silent otherwise; (4) revision prompt uses dynamic `candidateName` for signature preservation; (5) company context prompt updated to "a candidate" (was "Min Htet"); (6) cover letter export filename fallback changed from "Min Htet" to "Candidate"; (7) resume prompt BayCurrent/Entrepreneur First hardcoded examples replaced with generic `Company A – Role Description`; (8) SBF-specific +8 story ranking boost removed — generic signal matching only; (9) cover letter mock and revision mock updated to use `candidateName` dynamically; (10) all test fixtures updated to use "Alex Tan" / "Jordan Lee" (parser tests, PDF/DOCX export tests, story ranking tests, collation tests); (11) regression checks added for no-hardcoded-name prompt, generic filename fallback, and story ranking without founder boost.

Runtime constraints held: no Supabase schema changes, no parser architecture changes, no export/approval mechanics changes, no route changes, no new schema fields added (candidateName derived from existing header.fullName).

## Latest milestone (code)

**v0.9.13B - Post-Generation Save + Edit Workflow Repair**

Clear resume save model, package fix hub, cover letter manual vs AI revision split.

## Latest milestone summary (v0.9.13B)

Save resume edits (not mark reviewed), package fix actions before export, cover letter manual/AI modes separated.

## Milestone history (v0.9.x)

| Version | Theme |
|---------|--------|
| v0.9.13B | Post-generation save + edit workflow repair |
| v0.9.13A | Inventory cleanup + bullet control baseline |
| v0.9.12E | AI call cost guardrails — step estimates, research skip, Gemini call logging |
| v0.9.12D | Restore Generate company/role primary fields |
| v0.9.12C | Import robustness + output polish defaults (parser + line spacing + cover letter tone) |
| v0.9.12B | General DOCX resume import baseline — inline experience profile, broader section aliases, plain skills parsing |
| v0.9.12A | Remove founder identity from AI/export pipeline — dynamic candidate name, generic fallbacks |
| v0.9.11I | Package first viewport + mobile CTA/nav polish |
| v0.9.11H | Application Package guided review + Generate composer density |
| v0.9.11G | Mobile nav + alert fatigue — stacked nav, collapsible storage warnings, compact headers |
| v0.9.11F | Visual + flow correction — landing, nav, Generate, progress, Uploads, Applications |
| v0.9.11E | Live Package/Cover Letter UX fixes — mojibake, review cover-letter path, rail anchors, save model |
| v0.9.11D | Action placement and workflow surfaces - Generate, Package, Cover Letter, Applications |
| v0.9.11C | UI/UX redesign foundation - shell, page structure, package rail, A4 preview polish |
| v0.9.11B | IA cleanup — nav order, label renames, Generate advanced demotion, package action/developer hierarchy, merged Uploads list |
| v0.9.11A | UX quick wins — alerts, labels, approve dedup, version sync |
| v0.9.9 | Application Review Center — export/readiness aggregation on resume preview |
| v0.9.8H | Gemini model tier selection for resume/cover letter generation |
| v0.9.8G | Test runner consolidation, docs under `/docs`, scripts cleanup |
| v0.9.8F | Targeted forced bullet role rewrite |
| v0.9.8E | Cover letter PDF preview parity |
| v0.9.8D | Force bullet regeneration enforcement |
| v0.9.8B | Resume auto-repair (roles/bullets), non-blocking validation |
| v0.9.8A | Company name consistency, export naming, cover letter readability, research discoverability |
| v0.9.8 | Application package UX — inline cover letter, collapsed research, approve near resume |
| v0.9.7 | Cover letter architecture rewrite (bridges, story ranking, display names) |
| v0.9.6 | Auto research flow + dynamic progress stages |
| v0.9.5 | Firecrawl website research |
| v0.9.4 | Auto company context + Gemini retry |
| v0.9.3 | Company context generator (per-application) |
| v0.9.0–2 | Cover letter generation, revision, quality gates |

## Architecture (current)

```
Inventory (Supabase) + JD
  → buildResumeDraftPayloadFromInventory()
  → ensureCompanyContextForGeneration()  [Firecrawl if website + no saved website research]
  → POST /api/ai/generate-resume
      → parse JSON → normalize → repairGeneratedResumeContent() → validate → save draft
  → POST /api/ai/generate-cover-letter (uses saved company context + resume evidence spine)
  → /resume-preview/[draftId]  (application package)
```

**Key modules**

| Area | Entry points |
|------|----------------|
| Resume generation | `resume-draft-gemini.ts`, `generation-validation.ts`, `repair-generated-content.ts` |
| Cover letter | `cover-letter-gemini.ts`, `story-ranking.ts`, `generation-validation.ts` |
| Company research | `ensure-for-generation.ts`, `research.ts`, `firecrawl/scrape-company-website.ts` |
| Export | `buildExportResumeDocumentModel()`, `resolveExportDocumentModelForDraft()` |
| Application shell | `application_records`, `GenerateTailoredResumeSection`, `ResumePreviewPageClient` |

## Application package page order

1. Application Review — company, role, readiness, Approve for Export + resume PDF/DOCX downloads
2. Structure repair banner (when auto-repair ran)
3. Resume — PDF preview and collapsed layout sliders
4. Cover letter — **inline body**, Edit / PDF / DOCX
5. Company research — collapsed by default; summary visible in header
6. Edit resume content — hidden until toggled (evidence + regenerate)
7. Developer details — collapsed by default; assessment, browser layout estimate, PDF HTML, JSON

## Post-generation navigation

```
Generate → /resume-preview/{resumeDraftId}  (application package)
  → Edit cover letter → /cover-letter-preview/{coverLetterId}
  → Back to application package
```

## Run

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Build plan checklist (required before every milestone)

Before writing an implementation plan or code for any milestone, explicitly confirm:

1. Is this one focused milestone?
2. Are we avoiding unrelated scope?
3. Are we avoiding new one-off test scripts?
4. Are tests added to existing suites unless a new domain truly requires a new suite?
5. Are docs updated under `/docs`, not project root?
6. Are source-grep tests avoided unless explicitly justified?
7. Are environment variable changes documented?
8. Are user-facing model/API IDs verified before hardcoding?
9. Are Cursor-raised bugs/risks classified as Act Now / Investigate Now / Park / Accept Risk / Ignore?
10. Are commit/push instructions given after the milestone is complete?

See also `docs/TESTING.md` for test placement and grep policy.

## Next milestone

**v0.9.11D — deeper workflow redesign candidates** are parked for approval: post-generation review/edit/export flow consolidation, stronger package tabs or stepper, dedicated resume edit command model, cover letter revision hierarchy, Applications spine restructure, Inventory IA redesign, and Cover Letter hierarchy demotion.

Parked after that: v0.10.0 Inventory CRUD preparation/implementation, Edit Learning Log, v0.10.1 Cover Letter Version History.
