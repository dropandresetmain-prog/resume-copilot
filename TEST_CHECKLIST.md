# Test Checklist — Milestone 2

## AI enrichment

- [ ] `AI_PROVIDER=mock` works with no API key
- [ ] Provider banner shows mock/test label when using mock provider
- [ ] Provider banner shows Gemini/OpenAI label when configured
- [ ] "Enrich Inventory with AI" generates review cards
- [ ] Each card shows Issue, Before, Changes, Rationale, and Actions
- [ ] Suggested After appears when wording changes are proposed
- [ ] Keyword-only cards show keyword chips instead of suggested after
- [ ] Risk warnings appear when present
- [ ] Source filename chips appear when available
- [ ] Keyword, capability, role type, and alternative wording suggestions appear
- [ ] Duplicate bullet groups appear with reason text
- [ ] Accept / reject / ignore controls work
- [ ] Accepted keyword suggestions appear in keyword bank as approved
- [ ] Rejected/ignored suggestions remain visible with status badge
- [ ] "Test Gemini on small batch" button available in enrichment panel
- [ ] Small-batch test results stored separately from main enrichment
- [ ] Raw parsed resume data is unchanged after enrichment

## Gemini small-batch testing

When testing with `AI_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env.local`:

- [ ] Provider config panel shows Gemini provider and model name
- [ ] "Test Gemini on small batch" sends only 3–5 bullets (not full inventory)
- [ ] Test results appear in separate small-batch section (not main enrichment)
- [ ] Provider metadata shows bullets sent, suggestions returned, and timestamp
- [ ] Merge into main enrichment requires confirmation
- [ ] Discard test batch clears test results without affecting main enrichment
- [ ] JSON parses correctly from Gemini response
- [ ] Suggestions are specific to the bullets sent
- [ ] Keywords are real industry terms (Strategy, Operations, Product, etc.)
- [ ] No invented experience or metrics beyond bullet text
- [ ] Rationale makes sense for each suggestion
- [ ] Risk warnings are useful when scope could be overstated
- [ ] Invalid JSON shows error with collapsible raw model response (app does not crash)
- [ ] No API key exposed in browser network tab or UI

## Collated inventory (default tab)

- [ ] Collated Inventory tab is selected by default
- [ ] Work experiences merged across resumes by company + role
- [ ] Source filename chips appear on experiences and bullets
- [ ] Education shown as structured entries (institution, programmes, date range, bullets)
- [ ] Unknown sections appear under Unparsed / Needs Review with raw text
- [ ] Parse warnings visible when parser confidence is low
- [ ] Additional experience split into separate role items
- [ ] Skills shown as individual items grouped by category

## Source resumes / debug tab

- [ ] Per-resume parsed sections still available
- [ ] Raw fields expandable in debug view

## Inventory management

- [ ] Upload, delete, clear all, export, import still work
- [ ] Refresh preserves inventory
- [ ] Re-upload same filename replaces resume

## Tests

- [ ] `npm run test` passes (includes enrichment tests)
- [ ] Export/import preserves enrichment state (schema v2)

## Privacy

- [ ] No DOCX files stored on disk or in Git
