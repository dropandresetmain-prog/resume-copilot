# HANDOFF

## Current milestone

**v0.6.0 — Resume DOCX Export**

Approved generated drafts export to Word (.docx) via a shared `ResumeDocumentModel`. Preview and DOCX both consume the same canonical layout from `buildFinalResumeLayout()` wrapped by `buildResumeDocumentModel()`.

## Product flow (target)

```
Paste JD → Generate Resume → One-page preview → Approve for Export → Download DOCX
```

PDF export is next (v0.6.1). Cover letters deferred (v0.7.0). Manual inventory editing deferred.

## v0.6.0 highlights

**Shared document model**
- `buildResumeDocumentModel()` — single source for preview + DOCX (+ future PDF)
- Wraps `FinalResumeLayout` + layout settings + font metadata + filename

**DOCX export**
- `POST /api/export/resume-docx` — auth via `Authorization: Bearer <access_token>`
- Requires draft status `approved`
- Generates DOCX with `docx` npm package
- Uploads to Supabase `generated-documents` bucket: `{userId}/resumes/{draftId}/{fileName}.docx`
- Returns signed download URL (falls back to direct file response if storage upload fails)

**UI**
- Resume Preview: **Download DOCX** after approve; disabled PDF placeholder
- Records → Generated Drafts: **Download DOCX** for approved drafts

**Filename**
- `<FULL NAME> - Resume _<COMPANY> _<ROLE>.docx` or `<FULL NAME> - Resume.docx`

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.5.5 — Header & education rendering | Complete |
| **v0.6.0 — DOCX export** | **Current** |
| v0.6.1 — PDF export | Next |
| v0.7.0 — Cover letter generation | Later |
| Manual inventory editing | Deferred |

## Run

```bash
npm run dev
npm run test
```
