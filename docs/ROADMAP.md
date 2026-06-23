# Roadmap

## Current version

**v0.9.11E**

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

## Milestone log (recent)

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
