# Roadmap

**Current mode:** shipped product, real-use validation, issue-driven fixes.  
**Current code version:** `v0.9.19B`.  
**Updated:** 2026-07-01.

The Folio redesign and recovery milestones are complete on `main`. Their detailed history is archived in [`archive/recovery/FOLIO_RECOVERY_ROADMAP.md`](archive/recovery/FOLIO_RECOVERY_ROADMAP.md) and [`archive/history/ROADMAP_V0.9_HISTORY.md`](archive/history/ROADMAP_V0.9_HISTORY.md).

## Now

### Use Folio for live applications

- Run the canonical upload → vault → generate → output → approve → export → applications flow with real jobs.
- Record only reproducible product failures, trust gaps, or material workflow friction.
- Fix small confirmed issues in scoped changes with targeted regression coverage.

This is the stop rule: do not create another optimization milestone without evidence from real use.

## Next, only when selected

| Candidate | Why it may matter | Entry condition |
|-----------|-------------------|-----------------|
| Career Vault overhaul (formerly MX) | Replace remaining legacy VMT presentation, improve uploaded-resume visibility, and deepen structured editing | Real use shows Vault friction is blocking applications |
| Inventory CRUD completion | Add richer Education and other missing create/edit flows without breaking overlay/source semantics | A concrete editing gap recurs in live use |
| Cover-letter version history | Make accepted/rejected revisions recoverable | Users lose valuable letter states or avoid revision because undo is missing |
| Settings implementation | Replace the current shell with useful account/preferences controls | Specific settings are defined and needed |
| Fit rubric MVP | Move from the preview heuristic toward `fit-rubric-v1` | Product decides the score will drive decisions beyond advisory display |

Each candidate is a new milestone and should begin in a fresh implementation chat after a short current-code audit.

## Parked

- Cover-letter-only generation mode
- Persisted cover-letter evidence staging
- Education, skill, and keyword resume evidence controls
- Application kanban
- Additional company-search providers
- Reusing website research across roles at the same company
- Automatic resume compression or auto-shrink for one-page overflow
- Durable AI job ledger and server-side generation idempotency
- Full manual resume editor beyond the current structured controls

Parked work is not release-blocking. Promote an item only when live evidence justifies its cost and risk.
