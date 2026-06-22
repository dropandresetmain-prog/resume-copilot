# Test Checklist — v0.9.5 Firecrawl Company Research

## Website research

- [ ] Enter company website (e.g. `https://company.com`) → Research Company Website → summary reflects real site content
- [ ] Saved research shows `Website-backed research saved`
- [ ] `FIRECRAWL_API_KEY` set in server env (`.env.local`)

## URL separation

- [ ] Job posting URL in JD form does NOT auto-fill company website
- [ ] LinkedIn/Greenhouse job URL in company website field is rejected or falls back to JD-based
- [ ] Company website field label clarifies it is not the job posting URL

## Auto flow

- [ ] Combined generate with website + no saved research → Firecrawl + Gemini + resume + cover letter
- [ ] Second generate reuses saved research (no Firecrawl)
- [ ] No website → JD-based context only, no Firecrawl
- [ ] Firecrawl failure → warning + JD-based fallback, resume still generates

## Advanced actions

- [ ] Edit Saved Company Research
- [ ] Clear Saved Company Research
- [ ] Regenerate via Research Company Website

## Regression

- [ ] v0.9.4 Gemini retry still works
- [ ] Retry Cover Letter does not re-scrape or regenerate resume
- [ ] `npm run test` passes
