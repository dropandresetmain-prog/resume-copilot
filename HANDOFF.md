# HANDOFF

## Current milestone

**v0.5.5 — Header and Education Rendering Fixes**

Candidate name renders at section-header size (body + 0.5px). Education uses render-time normalization: one bold institution/special-programme line, separate italic degree lines, location on institution row, shared date range once.

## Product flow (target)

```
Paste JD → Generate Resume → Format-optimized one-page preview → Approve for Export → (future download)
```

Secondary: Edit Resume Details → `/resume-preview/[draftId]/edit`

## v0.5.5 highlights

**Header**
- Candidate name uses `sectionPx` (body + 0.5px) — same as Work Experience / Education section headers

**Education rendering**
- `normalizeEducationForLayout()` — render-time only; stored draft content unchanged
- Institution + special programme on one bold line; degrees on separate italic lines
- Location right-aligned on institution line; date range on first degree only
- Strips accidental duplicate institution names from parser/model output

## v0.5.4 highlights (recent)

**Records / Generated Drafts**
- **Edit** → `/resume-preview/[draftId]`
- **Delete** → removes row from Supabase `generated_resume_drafts` (with confirm)
- Labels: Company — Role, timestamp, status (Generated/Reviewed/Approved), provider/model

**One-page optimization**
- `optimizeResumePreviewSettings()` runs on preview load
- Starts 11px body font, tightens margins/spacing, then reduces font in 0.5px steps if needed
- Sliders remain for manual override

**Keyword repair**
- `repairKeywordBullet()` fixes `Experience: Specific Keyword: statement` patterns

**Skills section**
- Final layout: **Tech**, **Skills**, **Languages**, **Interests** (compact underlined labels)

**Assessment**
- **Resume–Job Fit** score (role match) separate from **Layout Fit (One Page)**
- Preview score uses provisional `preview-fit-heuristic-v1` — target rubric in `docs/FIT_SCORE_RUBRIC.md` (`fit-rubric-v1`)

**Draft edit safety**
- Generated resume preview/edit saves only to `generated_resume_drafts` — never mutates inventory
- Allowed inventory changes: enrichment review flow, future `/inventory` manual editing

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.5.3 — Preview fit & ordering | Complete |
| **v0.5.5 — Header & education rendering** | **Current** |
| v0.5.4 — Draft records + one-page optimization | Complete |
| v0.5.5 — Manual inventory editing | Planned |
| v0.6.0 — DOCX export | Next |
| v0.6.1 — PDF export | After DOCX |
| v0.7.0 — Cover letter generation | After export quality validated |

## Run

```bash
npm run dev
npm run test
```
