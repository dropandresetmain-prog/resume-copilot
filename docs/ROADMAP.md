# Roadmap

## Current version

**v0.9.8B**

## Completed capabilities

| Capability | Introduced |
|------------|------------|
| Inventory editing (bullet hide/edit overlay) | v0.7.7 |
| AI enrichment review | v0.4.x |
| Resume generation | v0.4A |
| Resume export (PDF + DOCX, one-page gate) | v0.6.x / v0.7.0 |
| Application records | v0.8.0 |
| Cover letter generation | v0.9.0 |
| Cover letter revision (quick actions) | v0.9.2 |
| Company context (Gemini, per-application) | v0.9.3 |
| Firecrawl website research | v0.9.5 |
| Auto company research in combined generate | v0.9.6 |
| Cover letter relevance architecture | v0.9.7 |
| Application package UX | v0.9.8 |
| Workflow paper cuts (naming, navigation) | v0.9.8A |
| Resume structure auto-repair | v0.9.8B |

## Milestone log (recent)

### v0.9.8B — Resume Generation Auto-Repair

- Auto-repair excess roles (keep top 4 by JD relevance)
- Auto-trim role bullets (max 4) and total bullets (max 13)
- Save repaired drafts with `needs_review` + visible repair banner
- Hard-block only irreparable failures

### v0.9.8A — Application Workflow Paper Cuts

- Company name display consistency across UI and exports
- Cover letter inline readability
- Company research discoverability (collapsed summary)
- Export filename normalization

### v0.9.8 — Application Package Preview UX

- Single-column package layout; approve/export next to resume controls
- Inline cover letter; company research + debug collapsed by default

### v0.9.7 — Cover Letter Relevance & Application Package

- Story ranking, explicit bridges, URL-free company names
- Post-generate lands on resume preview (application package)

### v0.9.6 — Auto Research Flow

- Website research runs automatically on Generate when website provided
- Dynamic progress stages; compact status in Advanced

### v0.9.5 — Firecrawl Company Research

- Server-side website scrape + Gemini synthesis
- JD fallback when scrape fails

### v0.9.3 — Company Context Generator

- Per-application `company_context` on `application_records`
- Injected into cover letter (and generation metadata)

## Next (planned)

### v0.9.9 — Application Review Center

Aggregated export/readiness dashboard on `/resume-preview/[draftId]` using existing signals (fit heuristic, validation, forced bullets, research, export gates). **Shipped.**

### v0.10.0 — Edit Learning Log

Track user edits to improve future generation. **Not started.**

### v0.10.1 — Cover Letter Version History

Versioned cover letter drafts per application. **Not started.**

## Parked (not scheduled)

- Additional search providers (Tavily, Serper, Perplexity)
- Reuse research across roles at same company
- Application kanban / apply tracking UI
- Lazy backfill of application records for legacy drafts
- JD-filtered keyword ranking, structured JD parse object
- Auto-shrink / AI compression for one-page overflow
- Full manual resume editor (beyond evidence regeneration)
