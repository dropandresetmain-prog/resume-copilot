# Roadmap

## Current version

**v0.9.13C**

## Completed capabilities

| Capability | Introduced |
|------------|------------|
| Inventory editing (bullet hide/edit overlay) | v0.7.7 |
| AI enrichment review | v0.4.x |
| Resume generation | v0.4A |
| Resume export (PDF + DOCX, one-page gate) | v0.6.x / v0.7.0 |
| Application records | v0.8.0 |
| Cover letter generation | v0.9.0 |
| Cover letter revision (quick actions) | v0.9.2 |
| Company context (Gemini, per-application) | v0.9.3 |
| Firecrawl website research | v0.9.5 |
| Auto company research in combined generate | v0.9.6 |
| Cover letter relevance architecture | v0.9.7 |
| Application package UX | v0.9.8 |
| Workflow paper cuts (naming, navigation) | v0.9.8A |
| Resume structure auto-repair | v0.9.8B |
| Application Review Center | v0.9.9 |
| UX quick wins | v0.9.11A |
| IA cleanup | v0.9.11B |
| UI/UX redesign foundation | v0.9.11C |
| Action placement and workflow surfaces | v0.9.11D |
| Live Package/Cover Letter UX fixes | v0.9.11E |
| Visual + flow correction (landing, nav, Generate, Applications) | v0.9.11F |
| Mobile nav + alert fatigue fix | v0.9.11G |
| Application Package guided review + Generate density | v0.9.11H |
| Package first viewport + mobile CTA/nav polish | v0.9.11I |
| Remove founder identity from AI/export pipeline | v0.9.12A |
| General DOCX resume import baseline | v0.9.12B |
| Import robustness + output polish defaults | v0.9.12C |
| Generate company/role primary fields restored | v0.9.12D |
| AI call cost guardrails (estimates, research skip, call logging) | v0.9.12E |
| Inventory duplicate cleanup + bullet control baseline | v0.9.13A |
| Post-generation save + edit workflow repair | v0.9.13B |
| Package review workspace decision tree | v0.9.13C |

## Milestone log (recent)

### v0.9.13C - Package Review Workspace Decision Tree

- Application Package owns review → fix → approve/export workflow.
- Structured resume editor on package (not on A4 preview); mobile Edit/Preview/Layout tabs.
- Evidence pending queue with single apply; cover letter staged revision with accept/reject preview.
- AI fit summary from saved generation output (no page-load AI).
- Preview/export fit caveat copy + server mismatch banner.

### v0.9.13B - Post-Generation Save + Edit Workflow Repair

- Resume editor: "Save resume edits" CTA, dirty/saved status, beforeunload warning.
- Application Package: Fix resume text / evidence / cover letter / layout actions before approve/export.
- Cover letter: Manual edit vs AI revision sections; manual Save only primary when dirty.
- Evidence panel: role-count rewrite label, clearer include/exclude scope.
- **Parked:** evidence pending change queue, cover letter undo/history, full package redesign.

### v0.9.13A - Inventory Cleanup + Bullet Control Baseline

- Deterministic duplicate/variant detection within the same company/role (metrics + keyword overlap + text similarity).
- Inventory UI panel: Keep one / Hide from generation / Keep both / Mark alternate wording.
- Decisions stored in `InventoryEdits` (`hiddenBulletKeys`, `dismissedDuplicateGroupIds`, `alternateWordingBulletKeys`).
- Regeneration panel copy: include vs exclude evidence; targeted rewrite preferred over full regenerate.
- **Parked:** full Inventory CRUD, AI-assisted merge, bullet version history.

### v0.9.12E - AI Call Cost Guardrails

- Generate shows pre-run AI step estimate (1 / 2 / 3 + website fetch).
- User can skip website research for the current run (JD-only); wired through `planCompanyResearchForGeneration` and `ensureCompanyContextForGeneration`.
- `callGeminiWithRetry` emits structured `[gemini-call]` logs (logical step, tier, model, attempts, fallback, error).
- Forced-bullet regeneration buttons include short scope copy.
- **Parked:** durable AI job ledger, server idempotency, per-attempt client metadata.

### v0.9.12D - Restore Generate Company and Role Primary Fields

- Company and Target role fields visible in primary Generate composer (above JD textarea).
- Recruitment checkbox remains near Company (UI-only, disabled).
- Advanced options (optional) collapse holds Job URL only.

### v0.9.12C - Import Robustness + Output Polish Defaults

**Import:** Inline comma disambiguation (company/role heuristics), date-first descriptor skip, title-case Summary/References/etc. as unparsed.

**Output:** Resume `PREVIEW_LINE_SPACING_DEFAULT` 1.12 (preview/PDF/DOCX via shared layout model). Cover letter generation/revision prompts avoid em dashes and inflated AI/corporate wording.

### v0.9.12B - General DOCX Resume Import Baseline

- Section detection: added "Employment History", "Professional History" → work_experience; "Certifications", "Achievements", "Awards", "Honors", "Publications", "Activities" → additional_experience; "Key Skills", "Core Competencies", "Competencies", "Skill Set", "Areas of Expertise", "Technologies", "Tools & Technologies" → skills; "Qualifications", "Academic History", "Education & Training" → education.
- Inline experience profile: new parser profile (`inline-experience.ts`) handles "Role at Company — Date", "Role | Company | Date", and comma-separated "Role, Company, Date" single-line formats; also handles date-first blocks ("Date\nRole, Company"). Registered alongside two-line-column profile; best-score wins.
- Skills parsing: plain comma/semicolon-separated lines now split into individual `other` items; bullet-list skills stripped and split; custom labeled lines (e.g. "Programming: Python, SQL") parsed into technicalSkills.
- Profile/contact parser: confirmed generic — no hardcoded name patterns.
- Tests: behavior-level tests added to `parser.test.ts` (inline format, date-first, plain bullets, plain comma skills, bullet skills, labeled skills) and `section-detection.test.ts` (Employment History, Career History, Certifications, Key Skills, Core Competencies aliases). Original reference tests unchanged.

### v0.9.12A - Remove Founder Identity From AI/Export Pipeline

- Cover letter prompt: removed "Min Htet" hardcoding; now uses `candidateName` from `CoverLetterGenerationInput` (derived from `header.fullName`), falls back to "the candidate" / "[Candidate Name]" closing.
- Cover letter validation: signature check now validates against `candidateName` when provided; silent when no name available. Removed founder-specific warning.
- Cover letter revision prompt: uses dynamic `candidateName` for closing/signature preservation instruction.
- Company context prompt: "helping Min Htet prepare" → "helping a candidate prepare"; "Min Htet story themes" → "candidate story themes".
- Cover letter export filename: fallback changed from "Min Htet" → "Candidate".
- Resume prompt: removed BayCurrent/Entrepreneur First hardcoded examples; replaced with generic "Company A – Role Description"; replaced BayCurrent-specific Work Experience rule with generic early-career/less-relevant-role guidance.
- Story ranking: removed SBF-specific +8 boost; generic domain/signal matching only. (SBF role still ranks first for B2B sales JDs via generic commercial signals — validated by test.)
- Mock cover letter: uses `candidateName` dynamically; removed SBF story paragraph; removed "Singapore Business Federation" company reference.
- Revision mock: `truncateToMaxWords` now accepts `closingName` parameter.
- All test fixtures updated to generic names (Alex Tan, Jordan Lee). Regression checks added for: no-hardcoded-name prompt, filename fallback = Candidate, story ranking without SBF boost.
- No schema changes, no parser changes, no export/approval mechanic changes.

### v0.9.11I - Package First Viewport + Mobile CTA/Nav Polish

- Application Package page two-column layout on desktop (lg+): sticky 20rem action rail (review/approve/export) left, resume PDF preview as dominant right column. First viewport shows both simultaneously.
- Review center Approve→Export changed from two-column grid to single-column stack — fits the narrow sidebar without overflow.
- Removed the sticky section rail (superseded by the left-column layout).
- Mobile nav replaced with compact `grid-cols-5` — no horizontal scroll, no clipping. "Applications" shortened to "Apps" on mobile. Generate stays visually primary (dark pill). `mobileLabel` field added to `AppNavItem`.
- Generate JD textarea height constrained on mobile (`h-[6.5rem]`) with `sm:h-auto` restoring desktop rows-based height.
- Sticky bottom Generate CTA bar added on mobile only (sm:hidden): mirrors main action, same `canGenerate` disabled guard, bottom spacer prevents content overlap.
- JD panel intro description shortened.
- No schema, generation, export/approval logic, or model ID changes.

### v0.9.11H - Application Package Guided Review + Generate Composer Density

- `DRAFT_READY` status: fresh drafts open with a neutral cyan banner ("Draft ready — approve to export") instead of the red "Not Ready to Export" alarm.
- Explicit two-step Approve → Export sequence in ApplicationReviewCenter: Step 1 Approve is the primary action (pre-approval); after approval, export controls become primary and Approve collapses to a secondary re-approve link.
- Review checklists moved behind a "Review details (N)" disclosure — the review card is now compact rather than a wall blocking the resume.
- Compact Application Package page header (no longer describes the layout in prose).
- Generate composer density: base resume selector + Generate CTA appear directly after the JD textarea; optional company/role/URL/recruitment-firm fields are collapsed under "Job details (optional)."
- Single compact readiness strip on Generate (sign in · upload resume · paste JD · provider configured) replaces 4–5 scattered amber/red notices.
- Mobile nav right-edge fade affordance (sm:hidden gradient overlay) signals scroll when Profile is off-screen.
- No schema, generation, export/approval logic, or model ID changes.

### v0.9.11G - Mobile Nav + Alert Fatigue Fix

- Stacked mobile nav: compact RC brand on row one, full-width horizontal nav on row two (no logo/Generate overlap).
- Collapsible compact storage warnings on Generate, Uploads, and Applications.
- Tighter page headers and quieter Generate readiness notice so composer/CTA appear sooner.
- No schema, generation, export, or model ID changes.

### v0.9.11F - Visual + Flow Correction

- Richer startup-style landing hero with centered tags/CTA and product-document visual treatment.
- Premium shell nav: Generate is early and styled as primary CTA; improved typography and mobile scroll nav.
- Generate composer: centered large CTA, quieter base-resume row, saved jobs limited to 10 with show more/less, recruitment-firm checkbox UI (disabled/coming soon).
- Dynamic generation progress panel with stage hints and animated treatment.
- Uploads: inventory summary row layout; single-column uploaded resume list.
- Applications: rollup summary stats; compact collapsed cards with expandable details.
- No Supabase schema, generation, export/approval, or model ID changes. Inventory duplicate/bullet cleanup remains parked.

### v0.9.11E - Live Package/Cover Letter UX Fixes

- Fixed mojibake `Saving…` text in Cover Letter editor save button.
- Application Review Center now always provides a cover letter action: "Edit cover letter" when one exists, "Go to cover letter" anchor to the package section when missing.
- Package sticky rail now conditionally renders the "Research" item — only shown when company context exists, eliminating dead anchors.
- Cover Letter editor save model clarified: Save changes is primary only when Raw Text is selected or unsaved manual edits exist; disabled otherwise. Helper copy accurately states quick revisions are auto-saved.
- No route, Supabase schema, generation, export/approval, or model ID changes.

### v0.9.11D - Action Placement and Workflow Surface Redesign

- Added shared action surface classes for primary, secondary, export, revision, notes, and destructive lanes.
- Clarified Generate primary CTA placement and kept advanced/saved-job controls secondary.
- Reworked Application Package review/export/edit hierarchy without changing approval or export behavior.
- Separated Cover Letter edit/save/export/revision responsibilities.
- Added Applications card primary package action and demoted notes/status/details actions.
- Kept existing route URLs and preserved generation, Supabase persistence, schema, export/approval gates, model IDs, and source-of-truth rules.
- Parked deeper post-generation workflow redesign and all previously parked product features for later milestones.

### v0.9.11C - UI/UX Redesign Foundation

- Upgraded the shared workspace shell, nav, page headers, cards, tabs, buttons, and A4 preview frames.
- Reworked Uploads, Inventory, Generate, Applications, Application Package, Resume Edit, Cover Letter Edit, and Profile around clearer primary actions and secondary detail areas.
- Kept existing route URLs and preserved generation, Supabase persistence, schema, export/approval gates, model IDs, and source-of-truth rules.
- Parked recruiter/confidential-client mode, force-exclude semantics, internship ranking policy, and Inventory CRUD for follow-up milestones.

### v0.9.11B — IA Cleanup

- Reordered main nav labels to Uploads → Inventory → Generate → Applications → Profile while keeping `/setup` and `/records` routes unchanged.
- Renamed Manage Uploads/Records page labels to Uploads/Applications and bumped the shared version label to v0.9.11B.
- Co-located Application Review approve and resume export actions without changing approval/export logic.
- Collapsed package assessment/debug/browser-layout details under a single Developer details drawer.
- Moved Generate secondary controls under Advanced while keeping JD input, base resume, and Generate as the visible primary path.
- Merged Uploads cloud storage and parsed resume lists into one row-per-file presentation.
- Added SetupCard visual hierarchy variants.
- B6 remains Investigate Now unless approved: saved-job management on Generate was investigated, but not removed.

### v0.9.11A — UX Quick Wins

- Unified version labels and persistence alerts.
- Removed duplicate approve affordances.
- Clarified navigation labels, collapsed layout controls, added cover-letter unsaved hint, and improved draft delete error UX.

### v0.9.8B — Resume Generation Auto-Repair

- Auto-repair excess roles (keep top 4 by JD relevance)
- Auto-trim role bullets (max 4) and total bullets (max 13)
- Save repaired drafts with `needs_review` + visible repair banner
- Hard-block only irreparable failures

### v0.9.8A — Application Workflow Paper Cuts

- Company name display consistency across UI and exports
- Cover letter inline readability
- Company research discoverability (collapsed summary)
- Export filename normalization

### v0.9.8 — Application Package Preview UX

- Single-column package layout; approve/export next to resume controls
- Inline cover letter; company research + debug collapsed by default

### v0.9.7 — Cover Letter Relevance & Application Package

- Story ranking, explicit bridges, URL-free company names
- Post-generate lands on resume preview (application package)

### v0.9.6 — Auto Research Flow

- Website research runs automatically on Generate when website provided
- Dynamic progress stages; compact status in Advanced

### v0.9.5 — Firecrawl Company Research

- Server-side website scrape + Gemini synthesis
- JD fallback when scrape fails

### v0.9.3 — Company Context Generator

- Per-application `company_context` on `application_records`
- Injected into cover letter (and generation metadata)

## Next (planned)

### v0.9.11C — IA Restructure Candidates

Potential medium-risk UI restructuring only: package tabs, Applications spine restructure, Inventory IA redesign, and Cover Letter hierarchy demotion. **Not started.**

### v0.10.0 — Inventory CRUD

Prepare and implement Inventory CRUD for work experience, bullets, skills, education, additional experience, and keywords without breaking the inventory source-of-truth model. **Not started.**

### v0.10.1 — Cover Letter Version History / Learning Log

Versioned cover letter drafts per application and/or edit learning log. **Not started.**

## Parked (not scheduled)

- Additional search providers (Tavily, Serper, Perplexity)
- Reuse research across roles at same company
- Application kanban / apply tracking UI
- Lazy backfill of application records for legacy drafts
- JD-filtered keyword ranking, structured JD parse object
- Auto-shrink / AI compression for one-page overflow
- Full manual resume editor (beyond evidence regeneration)
