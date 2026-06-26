# HANDOFF

## Current version

**v0.9.17B** (code)

## v0.9.17B implementation note

M1 Unified Evidence Spine: deterministic cross-category evidence ranking before Gemini; ranked slices for education/skills/additional; spine snapshot on input for fit summary and future M2 story spine.

**Spine:** `src/lib/evidence/` collects work bullets, additional experience, education, skills, evidence-tied keywords, and company-context positioning notes; scores JD overlap, role signals, metrics, recency, accepted wording, forced/excluded state, and within-role redundancy.

**Resume generation:** `buildResumeDraftGenerationInput` uses spine shortlist for work bullets (cap still **40**); education/skills/additional capped at 3/5/5 by JD rank. Phase 0 compact prompt payload preserved.

**Rationale:** deterministic `selectionAudit` fields merged from spine snapshot on save (Gemini still writes prose).

**Safety:** no new Gemini calls; no Supabase schema migration; cover letter story spine not implemented.

**Next:** M2 Cover Letter Story Spine.

## v0.9.17A implementation note

Phase 0 Prompt & Payload Hygiene: reduces resume/cover letter Gemini input volume and improves company-aware positioning **without** lowering `MAX_RESUME_DRAFT_BULLETS` (still 40) or implementing M1 evidence spine.

**Resume:** compact prompt JSON; prune redundant `rawTexts` in prompt only; shortened system instructions; company context appendix uses `formatCompanyContextForResumePrompt` for positioning/framing (not “light use only”).

**Cover letter:** hiring-argument instruction; tighter anti-generic company language. Evidence universe unchanged (resume draft).

**Safety:** full generation input + validation unchanged; no schema/provider/export changes.

**Next:** M1 Unified Evidence Spine. Manual live QA: [`PHASE0_MANUAL_QA.md`](PHASE0_MANUAL_QA.md).

## v0.9.16E implementation note

Application Record Delete / Archive: safe cleanup for old or test application rows on the Applications page.

**Behavior:** Archive sets `application_records.status` to `archived` (existing status — no schema change). Archived records are hidden from the default Applications list. Linked generated resume drafts, cover letter drafts, job descriptions, and embedded company context are **not** deleted.

**UI:** Expanded application details include **Archive application** with `window.confirm` — copy states linked drafts are retained. Status dropdown excludes `archived` (dedicated action only).

**Generate reuse:** `findApplicationRecordByJobDescriptionId` skips archived records so generating for the same saved job creates a fresh application.

**Package routes:** `/resume-preview/{draftId}` and `/cover-letter-preview/{id}` still load archived applications by draft id — drafts remain reachable.

**Parked:** Show archived toggle; hard delete; restore from archive.

## v0.9.16D implementation note

Inventory Cleanup Audit & Repair: existing polluted inventory where Add-from-Text projects landed in Work Experience is now inspectable and repairable on the Inventory page.

**Audit:** `auditProjectLikeOverlayPollution()` detects project-like rows in `addedExperiences` + related `addedBulletsByExperienceKey` buckets; reuses v0.9.16C `project-guard`.

**UI:** `InventoryProjectCleanupPanel` — per-item review with Move to Additional Experience, Keep as Work Experience, or Hide for now. Cleanup saves immediately.

**Normalization change:** `normalizeInventoryEdits()` no longer auto-migrates project overlay rows — migration is user-reviewed via the cleanup panel (v0.9.16C silent migration removed).

**Regeneration:** After cleanup, UI warns that existing generated drafts may still reflect old Work Experience placement — user must regenerate manually.

**Storage paths:** `addedExperiences` + `addedBulletsByExperienceKey` → `addedAdditionalExperienceItems` (category Projects); optional `keptProjectLikeWorkExperienceIds`, `dismissedProjectOverlayCleanupIds`, `projectInventoryCleanupAt`.

**Parked:** Full Inventory CRUD; education overlay.

## v0.9.16C implementation note

Keep Projects Out of Work Experience: Add-from-Text project notes route to Additional Experience, not Work Experience.

**Classification:** Extraction prompt + parse normalization + apply-time `project-guard` coerce personal/side/portfolio/GitHub/AI demo projects to `additional_experience`.

**Storage:** One project per `addedAdditionalExperienceItems` line (`Project Name: description`); freelance/client engagements with real company names remain `addedExperiences`.

**Migration (superseded by v0.9.16D):** was automatic in `normalizeInventoryEdits()` — now user-reviewed cleanup panel.

**Generation:** Projects flow via `collated.additionalExperienceItems` → payload `additionalExperience` — not `experiences`.

**Parked:** Full Inventory CRUD; education overlay.

## v0.9.16B implementation note

Export Trust & A4 Fit Accuracy: makes preview vs server fit trustworthy and actionable without redesigning the Application Package or changing generation.

**Measurement parity:** Server Puppeteer now measures the same `.resume-pdf-a4-page` scrollHeight as browser PDF preview before counting pages — overflow amount (mm) included in approve/validate/export 422 responses.

**UI:** `ExportFitStatusPanel` shows browser preview vs server validation side by side, scenario-specific guidance (preview-fits/server-fails, both overflow, pending), and prioritized layout fix suggestions with one-click Apply.

**Suggestions:** `buildLayoutFixSuggestions()` recommends specific slider steps (body font, section spacing, line spacing, margins) plus content trims when needed.

**Limitations:** OS font differences can still cause boundary disagreements; server page count remains export truth. No bundled web fonts. No US Letter.

**Next:** Parked v0.9.15A+ items (per-section accept, selected-bullet revision, education overlay, cover letter-only generate, full Inventory CRUD).

## v0.9.16A implementation note

Tailoring Quality Upgrade: improves first-draft resume positioning without new AI calls or schema changes.

**Prompt:** JD-specific bullet reframing (reframe evidence for target responsibilities; preserve exact metrics); anti-generic language ban list; richer saved rationale (`strongestMatches`, `honestGaps`, `positioningAngle`, `roleSelectionRationale`); senior roles must not be displaced by internships by default.

**Ranking:** `sortExperiencesForGeneration` / payload bullet selection now scores JD relevance + recency with early-career penalty; repair role drops use the same penalty.

**Validation:** `tailoring-quality.ts` warns on near-duplicate bullets, keyword stuffing, unsupported invented metrics, generic rationale, thin rationale, and internal label leaks (warnings only — non-blocking).

**Fit summary:** `buildPackageFitSummary` and `calculateFitScore` consume richer `selectionAudit` fields when present.

**Limitations:** Output quality still depends on inventory evidence quality; no learning log; no separate critique AI call.

**Next:** Parked v0.9.15A+ items (per-section accept, selected-bullet revision, education overlay, cover letter-only generate, full Inventory CRUD).

## v0.9.15E implementation note

E2E Trust & Workflow Fix Pack: addresses audit findings across Inventory save trust, revision queue discoverability, cover letter placeholder guard, Generate partial-failure action placement, and website discovery readiness.

**Resume revision:** Professional summary scope hidden when not exported in one-page format; JD-missing amber hint; re-approval warning on Accept when draft was approved.

**Inventory:** beforeunload on unsaved edits; duplicate cleanup save-state strip; enrichment auto-save feedback; education preview-only suggestions cannot be accepted.

**Application Package:** Custom resume revision queue action + copy in decision tree (does not open by default).

**Generate:** Partial failure demotes Regenerate Resume (confirm + link style); medium-confidence website discovery readiness row; Firecrawl footnote on AI estimate when website fetch enabled.

**Cover letter:** Initial generation prompt removes `[Candidate Name]` placeholder; validation rejects placeholder signatures (unchanged).

**Next:** Parked v0.9.15A+ follow-ups (per-section accept, learning log, critique AI call).

## v0.9.15D implementation note

Resume Revision Queue: stage multiple scoped custom revision instructions (professional summary + one or more roles), then run **one** Gemini call via `POST /api/ai/revise-resume-scope` batch mode (`queue[]`). Preview all proposed changes; Accept all persists; Reject all discards. Staging/typing never calls AI.

**Batch output:** strict JSON with `summaryCandidate`, `roleCandidates[]`, `warnings[]`. Validation rejects unqueued roles, identity mismatches, and invalid bullets — partial failures warn and leave sections unchanged.

**Single-scope API preserved** for backward compatibility (`scope` + `customInstruction` without `queue`).

**Parked:** selected-bullet revision, per-section accept, skills/education revision, whole-resume rewrite.

## v0.9.15C implementation note

Post-Generation Custom Revision Reliability: fixes cover-letter revision leaking `[Candidate Name]` placeholders; adds staged resume custom revision (professional summary + selected role scopes).

**Cover letter fix:** `revise-cover-letter` route derives `candidateName` from linked resume draft `header.fullName` and passes it through prompt, validation, and parse. Revision prompt no longer uses bracketed placeholder fallbacks — preserves existing closing signature when name unavailable. Validation rejects placeholder signatures in output.

**Resume custom revision:** Staged panel on Application Package edit-resume mode — choose scope (summary or role), enter custom instruction, Revise once, preview, Accept persists scoped change only. New `POST /api/ai/revise-resume-scope` reuses targeted role rewrite infrastructure for role scope; summary scope uses dedicated prompt. Default `persist: false` (candidate-only until Accept).

**Parked:** whole-resume custom rewrite, cover-letter version history, selected-bullet custom revision, unsaved resume header edits warning before cover-letter revision.

## v0.9.15B implementation note

Apply Extracted Work Experience + Bullet Suggestions: extends v0.9.15A so accepted work experience and bullet suggestions persist through the inventory overlay.

**Applyable:** new work experiences (`addedExperiences`), bullets to existing or new roles (`addedBulletsByExperienceKey` + auto-create overlay experience when needed), skills, additional experience, keywords.

**UX:** Suggestions classified as Will be added / Needs manual placement / Preview only before apply. Skipped items listed with reasons after apply. Duplicate bullets not re-added.

**Generation:** `buildActiveCollatedInventory` includes overlay experiences and imported bullets for resume generation.

**Still preview-only:** education entries. Full Inventory CRUD remains parked.

## v0.9.15A implementation note

Add Experience From Text: baseline flow on Inventory to paste free-form career text (ChatGPT summaries, project notes, rough bullets) and extract structured suggestions via Gemini/mock for user review before apply.

**UX:** “Add from text” → paste → “Extract suggestions” → accept/reject/edit per item → “Apply accepted suggestions”. No auto-save before user confirms apply.

**Applyable (inventory overlay):** bullets mapped to existing experience (`addedBulletsByExperienceKey`), skills (`addedSkillItems`), additional experience lines (`addedAdditionalExperienceItems`), keywords (enrichment `keywordBank`).

**Preview only (parked persistence):** new work experience entries, bullets for unmatched roles, education entries.

**Safety:** Extraction prompt forbids fabrication; thin paste returns insufficient; duplicate-ish bullets flagged against collated inventory; source resumes never mutated.

**Parked:** full Inventory CRUD, new-experience persistence, education overlay, auto-save on extract.

## v0.9.14B implementation note

Company Website Discovery + Verification: when company website is empty and context is needed, Firecrawl `/v1/search` (same `FIRECRAWL_API_KEY` as scrape) finds candidate homepages; verification scores confidence (high / medium / low) and rejects job boards, social, news, and directories.

**Policy:** High confidence requires homepage verification (SERP-only never auto-high). Medium → user confirmation. Low / no match → JD-only. Confidential → no discovery (UI + API).

**UX:** Explicit “Find company website” only (no Generate preflight). Generate disabled while discovery runs. Cached per composer form state.

**Cost:** 1 Firecrawl search + up to 2 verification scrapes per Find (`MAX_DISCOVERY_VERIFICATION_SCRAPES`).

**Env:** Production requires `FIRECRAWL_API_KEY`; `AI_PROVIDER=mock` discovery fixtures are disabled in production. Mock fixtures only when `NODE_ENV !== "production"`.

## v0.9.14A implementation note

Generate Decision Tree & Context Policy: pre-generation flow from job intake to Generate with automatic, explainable context policy.

**Output mode:** Visible near Generate CTA (default Resume + Cover Letter; Resume only; Cover letter only parked/disabled).

**Context policy:** Confidential/recruitment → JD-only (no Firecrawl, no saved website context). Website provided or high-confidence URL in JD → website + JD. Otherwise → JD-only with clear copy.

**Company source of truth:** Single Company field feeds job metadata, application record, and generation — `companyNameOverride` removed from generate path.

**UI:** Merged advanced surfaces — primary composer (company, role, JD, output, context summary, base resume, CTA); secondary details (job URL, models, website, instructions, saved jobs collapsed).

**Parked:** cover letter-only generation (needs existing tailored resume draft), broad web search discovery, text blob inventory import.

## v0.9.13D implementation note

Fit Summary Signal Upgrade: package AI fit summary is now decision-quality at a glance — verdict, your strongest fits, key gaps, and a positioning angle — composed deterministically from saved generation output (fit score, rationale, strengths, omissions). No page-load AI. ≤100 words, second-person voice, no “the candidate.”

## v0.9.13C implementation note

Package Review Workspace Decision Tree: Application Package is the central post-generation hub with staged changes and deliberate apply actions.

**Decision tree:** Review workflow panel with Edit resume text, Fix resume evidence, Adjust resume layout, Revise cover letter, Approve for export. Readiness checklist replaces ambiguous "reviewed" language.

**Structured resume editor on package:** Form fields for header/contact, summary, experience, education, skills, additional experience. Desktop edit + live PDF preview; mobile Edit / Preview / Layout tabs. Save resume edits downgrades approval (`layout_changed`) when previously approved.

**Evidence queue:** Stage remove / add / exclude; summary before apply; Apply evidence changes once. Local removes avoid Gemini; adds use targeted rewrite. Full regenerate is last resort.

**Cover letter staged revision:** Instruction chips + custom notes; single Revise cover letter AI call; preview accept/reject before persist.

**AI fit summary:** ≤100 words derived from saved `rationale.overall` + `calculateFitScore()` — no page-load AI. No schema change. *(Superseded by v0.9.13D verdict + gaps + positioning composition.)*

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

**v0.9.16E - Application Record Delete / Archive**

## Latest milestone summary (v0.9.16E)

Archive application records from the Applications list without deleting linked resume/cover letter drafts; archived hidden by default; generate reuses JD only when no active application exists.

## Latest milestone summary (v0.9.16D)

Project-like overlay Work Experience rows are auditable on Inventory; user-reviewed move/keep/dismiss; regeneration warning after cleanup; silent normalize migration removed.

## Latest milestone summary (v0.9.16C)

Add-from-Text project notes route to Additional Experience overlay (not Work Experience); freelance/client roles unchanged.

## Latest milestone summary (v0.9.16B)

Preview/export fit trust: shared content-height measurement, server overflow reporting, scenario-specific mismatch guidance, and actionable layout fix suggestions with quick-apply on the Application Package.

## Latest milestone summary (v0.9.16A)

Resume generation tailoring: JD-specific reframing instructions, anti-generic language, richer saved rationale for fit summary, JD-relevance role ranking with early-career penalty, and non-blocking tailoring validation warnings.

## Milestone history (v0.9.x)

| Version | Theme |
|---------|--------|
| v0.9.16E | Application record archive / safe cleanup |
| v0.9.16D | Inventory project overlay cleanup audit & repair |
| v0.9.16C | Keep projects out of work experience |
| v0.9.16B | Export trust & A4 fit accuracy |
| v0.9.16A | Tailoring quality upgrade |
| v0.9.15E | E2E trust & workflow fix pack |
| v0.9.15D | Resume revision queue (batch scoped revision) |
| v0.9.15C | Post-generation custom revision reliability |
| v0.9.15B | Apply extracted work experience + bullets |
| v0.9.15A | Add experience from text |
| v0.9.14B | Company website discovery + verification |
| v0.9.14A | Generate decision tree & context policy |
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

**v0.9.16B Export Trust** — completed in code.

Parked after that: v0.9.15A+ candidates (per-section resume revision accept, selected-bullet custom revision, skills/education scoped revision, whole-resume custom rewrite, cover-letter version history, unsaved resume header edits warning before cover-letter revision, education overlay, cover letter-only generate path, full Inventory CRUD).
