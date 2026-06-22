# HANDOFF

## Current milestone

**v0.9.2 — Cover Letter Quality & Quick Revision**

420-word hard cap, banned AI-ish phrases, company name normalization, warmer conversational prompts, quick revision buttons on cover letter preview, export blocked when over limit or banned phrases present.

## v0.9.1 highlights

Partial failure recovery: cover letter failure no longer loses resume; Retry Cover Letter without regenerating resume.

## v0.9.0 highlights

Formal cover letter generation from JD + resume draft + Application Communication Profile + company context. Combined generate mode, `/profile` editor, `/cover-letter-preview/[draftId]` with PDF/DOCX export, secondary formats copyable on preview and via Records links.

## v0.8.0 highlights

Application shell: `application_records` linked to JD and resume drafts; Records → Applications panel.

## Product flow

```
Paste JD → Generate Resume (& optional Cover Letter) → Application record
  → Resume preview / Cover letter preview → Edit → Download PDF / DOCX
```

## Cover letter (v0.9.x)

- **Profile** (`/profile`) — paste/save Application Communication Profile (one blob per user).
- **Generate** — mode: resume only OR resume + formal cover letter; advanced company fields; partial failure recovery (v0.9.1).
- **Cover letter preview** — edit formal letter, quick revision actions, download PDF/DOCX when ≤420 words, copy secondary formats.
- **Quality (v0.9.2)** — hard max 420 words; company names normalized for prose; banned internal positioning phrases; warmer conversational tone rules.
- **Revision API** — `POST /api/ai/revise-cover-letter` (shorten, tone, emphasis, custom instruction); does not touch resume.
- **Company context** — JD extraction + user fields; no live web search (paste context in additional instructions).

## Run

```bash
npm run dev
npm run test
supabase db push   # applies 20260622_application_communication_v090.sql
```
