# HANDOFF

## Current milestone

**v0.9.4 — Auto Company Context + Gemini Resilience**

Combined generation auto-creates company context when missing (one-click flow). Shared `callGeminiWithRetry` handles transient 503/429/5xx with backoff and optional model fallback. Company context failure does not block resume generation.

## v0.9.3 highlights

Gemini company context per application; manual generate/edit/save; reused by resume and cover letter.

## Product flow

```
Paste JD → Generate Resume & Cover Letter (one click)
  → [auto company context if missing] → resume → cover letter → preview
```

## Company context (v0.9.4)

- **Auto** — combined mode generates + saves context when application has none.
- **Manual** — Advanced → Preview/Edit or Regenerate (secondary).
- **Failure** — falls back to JD/company fields; resume still generates; warning shown.
- **Retry cover letter** — reuses saved context; does not regenerate context or resume.

## Gemini resilience (v0.9.4)

- `callGeminiWithRetry` in `src/lib/ai/call-gemini.ts` — 3 attempts, 1s/2s/4s backoff + jitter.
- Retries: 503 UNAVAILABLE, 429, 5xx, network timeouts.
- Does not retry: 400, parse/validation errors.
- Env: `GEMINI_MODEL_PRIMARY` (default `gemini-2.5-flash`), `GEMINI_MODEL_FALLBACK` (default `gemini-2.0-flash`).

## Run

```bash
npm run dev
npm run test
```
