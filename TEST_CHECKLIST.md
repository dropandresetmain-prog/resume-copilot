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
- [ ] Legacy enrichment data (without review fields) still renders without crashing
- [ ] Raw parsed resume data is unchanged after enrichment

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
