# HANDOFF

## Current milestone

**v0.9.3 — Company Context Generator**

Gemini-powered company context per application (JD + company fields only — no web search). Generate → preview/edit → save on `application_records`. Saved context reused by resume and cover letter generation. Generation still works without saved context (JD fallback).

## v0.9.2 highlights

420-word hard cap, banned AI-ish phrases, company name normalization, warmer conversational prompts, quick revision buttons on cover letter preview.

## v0.9.1 highlights

Partial failure recovery: cover letter failure no longer loses resume; Retry Cover Letter without regenerating resume.

## v0.9.0 highlights

Formal cover letter generation from JD + resume draft + Application Communication Profile. Combined generate mode, `/profile` editor, `/cover-letter-preview/[draftId]` with PDF/DOCX export.

## Product flow

```
Paste JD → (optional) Generate Company Context → Save → Generate Resume (& Cover Letter)
  → Application record → Resume / Cover letter preview → Edit → Download PDF / DOCX
```

## Company context (v0.9.3)

- **Scope** — saved on `application_records.company_context` (per job attempt, not global).
- **Generate** (`/generate` → Advanced) — Company Name, Country, Website, Additional Instructions → **Generate Company Context** → edit → **Save Company Context**.
- **Reuse** — saved context passed to resume (light) and cover letter (stronger) prompts.
- **Fallback** — if no saved context, JD + company fields only (`buildFallbackCompanyContext`).
- **API** — `POST /api/ai/generate-company-context` (`company-context-gemini.ts`).
- **No external research** — Gemini only; website is a clue, not fetched.

## Cover letter (v0.9.x)

- **Profile** (`/profile`) — Application Communication Profile.
- **Generate** — resume only OR resume + cover letter; partial failure recovery (v0.9.1).
- **Cover letter preview** — edit, quick revision, export when ≤420 words.
- **Quality (v0.9.2)** — 420-word max, banned phrases, company name normalization.
- **Company context in preview** — collapsible panel; edit/save back to application when linked.

## Gemini call map

See `src/lib/company-context/gemini-call-map.ts`. Full flow (company context + resume + cover letter, no enrichment): **3 Gemini calls**.

## Run

```bash
npm run dev
npm run test
supabase db push   # applies 20260623_application_company_context_v093.sql (+ prior migrations)
```
