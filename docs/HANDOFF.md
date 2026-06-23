# HANDOFF

## Current version

**v0.9.11C** (code)

## v0.9.11C implementation note

UI/UX Redesign Foundation is the latest code milestone. It delivers a broader visual and structural pass across the existing routes while preserving runtime behavior: premium framed workspace shell and sticky nav, stronger page headers/cards/buttons/tabs, cleaner A4 preview frames, Uploads readiness layout, CRUD-ready Inventory sections, composer-first Generate, Applications-first Records page, Application Package section rail/review-export focus, and clearer Resume Edit/Cover Letter/Profile editor surfaces.

Runtime constraints held: no Supabase schema/persistence changes, no generation semantics changes, no export/approval behavior changes, no model ID changes, and no source-of-truth changes. Recruiter/confidential-client mode, force-exclude semantics, internship ranking policy, and Inventory CRUD remain parked/follow-up.

## Latest milestone (code)

**v0.9.11C - UI/UX Redesign Foundation**

Broad UI/UX foundation pass across the existing route set. Route URLs and runtime source-of-truth behavior remain unchanged while the shell, page hierarchy, action bars, secondary drawers, package rail, and preview containers now support the v0.9.11C workflow direction.

Remaining workflow features are parked: recruiter/confidential-client mode, force-exclude semantics, internship ranking policy, and Inventory CRUD.

## Milestone history (v0.9.x)

| Version | Theme |
|---------|--------|
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

**v0.9.11C — IA restructure candidates** are parked for approval: package tabs, Applications spine restructure, Inventory IA redesign, and Cover Letter hierarchy demotion.

Parked after that: v0.10.0 Inventory CRUD preparation/implementation, Edit Learning Log, v0.10.1 Cover Letter Version History.
