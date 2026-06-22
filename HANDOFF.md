# HANDOFF

## Current milestone

**v0.9.6 — Auto Research Flow & Progress Bar Integration**

Combined Resume + Cover Letter generation automatically researches the company website when a website is provided and no website-backed research is saved. Progress stages reflect the actual research path. Manual research is demoted to an optional Advanced panel.

## v0.9.5 highlights

Firecrawl server-side website scrape; website-backed vs JD-based research; source metadata on `application_records.company_context`.

## Product flow

```
Generate Resume & Cover Letter (one click)
  → Save job + application
  → [if website + no website-backed research] Firecrawl + Gemini company research → Save
  → Build resume evidence → Generate resume → Generate cover letter → Save drafts
```

Without company website: **JD-based context only** (no Firecrawl).

If website-backed research already exists: **reuse saved research** (no Firecrawl).

## Company research (automatic)

| Condition | Behavior | Progress label |
|-----------|----------|----------------|
| Website-backed research saved | Reuse | Using saved company research |
| Website provided, no website-backed research | Firecrawl + Gemini | Researching company website |
| No website | JD-based context | Using JD-based context |
| Firecrawl/Gemini fails | JD fallback + warning | Company research failed; continuing with JD context |

**Note:** JD-only saved context does **not** block auto Firecrawl when user later provides a company website.

## UI (Generate page)

- **Advanced:** Company name, country, company website, additional instructions
- **Compact status:** `Company research: will run automatically` / `website-backed research saved` / etc.
- **Optional panel (collapsed):** View / edit research, Refresh research, Clear research
- No prominent “Research Company Website” CTA in the main generation card

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
npm run lint
npm run build
```
