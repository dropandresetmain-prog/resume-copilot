# Documentation index

Use this page to decide which document is authoritative before planning or changing the product.

## Active documentation

| Document | Role | Use it for |
|----------|------|------------|
| [`../README.md`](../README.md) | Project overview | Product flow, routes, local setup, and environment variables |
| [`HANDOFF.md`](HANDOFF.md) | Current state | Present branch/version, shipped behavior, immediate next work, and implementation checklist |
| [`ROADMAP.md`](ROADMAP.md) | Forward plan | Current priorities, optional future work, and parked scope |
| [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | Current risk ledger | Known limitations, accepted risks, and items worth investigating |
| [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md) | Code map | Active routes, page clients, APIs, persistence, and major modules |
| [`TESTING.md`](TESTING.md) | Automated verification | Test commands, suite placement, and test policy |
| [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) | Manual verification | Current end-to-end product checks |
| [`FOLIO_REDESIGN.md`](FOLIO_REDESIGN.md) | UI architecture | Current route contract, forbidden legacy remounts, and Folio UI rules |
| [`DESIGN.md`](DESIGN.md) | Product design language | High-level visual and component rules |
| [`FOLIO_DESIGN_TOKENS.md`](FOLIO_DESIGN_TOKENS.md) | Token reference | Implemented color, spacing, radius, and dialog conventions |
| [`CAREER_VAULT.md`](CAREER_VAULT.md) | Feature architecture | Current Career Vault data flow and overlay semantics |
| [`FIT_SCORE_RUBRIC.md`](FIT_SCORE_RUBRIC.md) | Target specification | Proposed deterministic fit rubric; clearly not the current scoring implementation |

Root-level `AGENTS.md` and `CLAUDE.md` are agent instructions, not product documentation, and remain at the repository root so tools can discover them.

## Archive

Everything under [`archive/`](archive/) is retained for history and should not be treated as current behavior without checking live code and active docs.

| Folder | Contents |
|--------|----------|
| [`archive/audits/`](archive/audits/) | One-time pre-redesign, post-redesign, and rollback audits |
| [`archive/recovery/`](archive/recovery/) | Completed Folio recovery roadmap and milestone log |
| [`archive/studies/`](archive/studies/) | Point-in-time AI call, prompt, quality, and latency studies |
| [`archive/plans/`](archive/plans/) | Completed implementation plans |
| [`archive/designs/`](archive/designs/) | Implemented milestone-specific design briefs |
| [`archive/milestones/`](archive/milestones/) | Completed milestone notes and QA checklists |
| [`archive/history/`](archive/history/) | Superseded active docs preserved as historical snapshots |

## Authority rules

1. Live code and tests win when documentation conflicts with implementation.
2. `HANDOFF.md` and `ROADMAP.md` define current state and forward priorities.
3. `PROJECT_FILE_MAP.md` and `FOLIO_REDESIGN.md` define route and client ownership.
4. Archived documents explain why decisions were made; they do not reopen completed milestones.
