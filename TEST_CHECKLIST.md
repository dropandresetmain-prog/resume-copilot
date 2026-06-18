# Test Checklist — Milestone 1

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

- [ ] `npm run test` passes (parser, inventory, duration, collation, education, section detection)

## Privacy

- [ ] No DOCX files stored on disk or in Git
