# HANDOFF

## Current milestone

**v0.5.4 — Draft Records + One-Page Optimization**

Generated drafts are manageable from Records (Edit/Delete). First preview load auto-optimizes layout for one-page fit starting at 11px body font. Keyword bullets are repaired when the model uses generic `Experience:` prefixes. Skills section splits into Tech, Skills, Languages, and Interests.

## Product flow (target)

```
Paste JD → Generate Resume → Format-optimized one-page preview → Approve for Export → (future download)
```

Secondary: Edit Resume Details → `/resume-preview/[draftId]/edit`

## v0.5.4 highlights

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

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.5.3 — Preview fit & ordering | Complete |
| **v0.5.4 — Draft records + one-page optimization** | **Current** |
| v0.5.5 — Manual inventory editing | Planned |
| v0.6.0 — DOCX export | Next |
| v0.6.1 — PDF export | After DOCX |
| v0.7.0 — Cover letter generation | After export quality validated |

## Run

```bash
npm run dev
npm run test
```
