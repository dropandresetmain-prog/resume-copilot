# Test Checklist — v0.9.3 Company Context

## Company context (Generate)

- [ ] Advanced section shows company context panel with disclaimer (no web search)
- [ ] **Generate Company Context** requires JD + company name
- [ ] Generated context is editable (summary, narrative angles visible)
- [ ] **Save Company Context** persists to application record
- [ ] Without saved context: message "Generation will use JD and company fields only"
- [ ] With saved context: message "Company context ready for this application"
- [ ] Generate resume/cover letter uses saved context (check stronger why-company in letter)
- [ ] Generate works when company context skipped entirely

## Records

- [ ] Application card shows Company context ✓ or — none
- [ ] **Edit company context on Generate page** link opens `/generate?jobId=...`

## Cover letter preview

- [ ] Collapsible company context panel when context exists
- [ ] Edit summary + save updates application record

## Regression (v0.9.2)

- [ ] 420-word cap, banned phrases, quick revision, export guards
- [ ] Partial failure recovery (v0.9.1)
- [ ] Resume generate / approve / export unchanged
- [ ] `npm run test` passes

## Schema

- [ ] `supabase db push` applies `20260623_application_company_context_v093.sql`

## Parked

- [ ] Live web company research (Tavily/Serper/Perplexity)
- [ ] Reuse context across different roles at same company
