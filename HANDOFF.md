# HANDOFF

## Current milestone

**v0.9.5 — Firecrawl Company Research**

Company website content is scraped server-side via Firecrawl, summarized by Gemini into structured company research, saved per application, and reused by resume + cover letter generation.

## v0.9.4 highlights

Auto company research in combined flow; Gemini retry/backoff; company research failure non-blocking.

## Product flow

```
JD + Company Website → [Firecrawl scrape] → Gemini company research → Save
  → Generate Resume & Cover Letter
```

Without company website: **JD-based context only** (no Firecrawl, no Gemini research call on auto path).

## Company research

- **Website-backed** — Firecrawl scrape + Gemini (`sourceType: website_research`)
- **JD-based** — local fallback or Gemini without scrape (`sourceType: jd_based_context`)
- **Job posting URL** — never used as company website; `jobUrl` is separate field
- **UI** — Research Company Website, Edit Saved Company Research, Clear Saved Company Research (Advanced)

## Environment

```bash
FIRECRAWL_API_KEY=   # server-side only
GEMINI_API_KEY=
AI_PROVIDER=gemini
```

## Run

```bash
npm run dev
npm run test
```
