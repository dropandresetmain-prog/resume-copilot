# HANDOFF

## Current milestone

**v0.9.0 — Application Communication / Cover Letter MVP**

Formal cover letter generation from JD + resume draft + Application Communication Profile + company context. Combined generate mode, `/profile` editor, `/cover-letter-preview/[draftId]` with PDF/DOCX export, secondary formats copyable on preview and via Records links.

## v0.8.0 highlights

Application shell: `application_records` linked to JD and resume drafts; Records → Applications panel.

## Product flow

```
Paste JD → Generate Resume (& optional Cover Letter) → Application record
  → Resume preview / Cover letter preview → Edit → Download PDF / DOCX
```

## Cover letter (v0.9.0)

- **Profile** (`/profile`) — paste/save Application Communication Profile (one blob per user).
- **Generate** — mode: resume only OR resume + formal cover letter; advanced company fields.
- **Cover letter preview** — edit formal letter, download PDF/DOCX, copy email/LinkedIn/DM/WhatsApp variants.
- **Company context** — JD extraction + user fields; no live web search in v0.9.0 (paste context in additional instructions).
- **Prompt rules** — Min Htet naming, real industry terms, story execution status, 350–450 words formal letter.

## Run

```bash
npm run dev
npm run test
supabase db push   # applies 20260622_application_communication_v090.sql
```
