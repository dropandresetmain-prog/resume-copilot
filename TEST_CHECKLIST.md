# Test Checklist — v0.9.6 Auto Research Flow & Progress Bar

## Automatic research (primary flow)

- [ ] Combined generate with website + no website-backed research → progress shows **Researching company website** → resume + cover letter succeed
- [ ] Compact status in Advanced shows **Company research: will run automatically** before generate
- [ ] No need to click manual research before Generate
- [ ] Second generate reuses saved website-backed research → progress **Using saved company research**, no Firecrawl
- [ ] No website → progress **Using JD-based context**, no Firecrawl
- [ ] Firecrawl failure → warning + progress **Company research failed; continuing with JD context**, resume still generates

## Progress bar

- [ ] Combined mode shows 7 stages including dynamic research stage
- [ ] Resume-only mode shows 5 stages (no research stage)
- [ ] Stage labels match actual behavior (no fake “researching” when skipping)

## JD-only + website edge case

- [ ] Application has JD-only saved context; user adds company website → next generate runs Firecrawl (does not reuse JD-only as final)

## Advanced / manual panel (secondary)

- [ ] Manual panel collapsed by default under Advanced
- [ ] View / edit research, Refresh research, Clear research work
- [ ] Compact status updates after generation (saved / failed / will run automatically)

## Regression

- [ ] Retry Cover Letter does not re-scrape or regenerate resume
- [ ] Job posting URL not used as company website
- [ ] `npm run test`, `npm run lint`, `npm run build` pass
