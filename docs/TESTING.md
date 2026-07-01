# Testing

Verification suites live under `tests/suites/`; `npm run test` runs all registered suites through `tests/run-all.ts`.

## Running tests

```bash
npm run test              # all suites (same order as pre-0.9.8G chain)
npx tsx tests/suites/parser.test.ts   # single suite
```

No Vitest/Jest — each suite is a standalone `tsx` script with `PASS`/`FAIL` checks and `process.exit(1)` on failure.

On Windows, if the global `npm`/`npx` shim is broken, run the checked-in local binary directly:

```powershell
.\node_modules\.bin\tsx.cmd tests\run-all.ts
.\node_modules\.bin\tsx.cmd tests\suites\parser.test.ts
```

## Build plan checklist

Every milestone plan must start by explicitly checking the 10 rules in [`HANDOFF.md` — Build plan checklist](HANDOFF.md#build-plan-checklist-required-before-every-milestone).

## Policy: bug fixes add test cases, not files

When fixing a bug:

1. Find the **existing suite** for that area (parser, export, cover letter, etc.).
2. Add a **new check** (or extend an existing checks array).
3. Only add a new suite file when the area has **no** existing coverage.

Document regressions with a short check name that states the invariant (e.g. `"revision client sends Authorization header"`).

## Suite layout

| Area | Suite file(s) |
|------|----------------|
| Parser / profile | `parser.test.ts`, `duration.test.ts`, `section-detection.test.ts`, `education.test.ts`, `skills-section.test.ts`, `profile.test.ts` |
| Inventory | `inventory.test.ts`, `collation.test.ts`, `inventory-edits.test.ts`, `inventory-text-extraction.test.ts`, `draft-inventory-safety.test.ts` |
| Generation | `generation-payload.test.ts`, `generate-flow.test.ts`, `generation-partial-failure.test.ts`, `gemini-retry.test.ts`, `resume-generation-validation.test.ts`, `resume-generation-repair.test.ts`, `forced-bullet-regeneration.test.ts` |
| Resume draft | `resume-draft.test.ts`, `resume-draft-review.test.ts`, `resume-draft-layout.test.ts` |
| Export | `resume-docx-export.test.ts`, `resume-pdf-export.test.ts`, `resume-pdf-page-count.test.ts`, `resume-approve-validation.test.ts`, `resume-pdf-preview-overflow.test.ts`, `resume-export-delivery.test.ts`, `resume-layout-parity.test.ts`, `resume-export-strategy.test.ts`, `resume-export-model-parity.test.ts`, `resume-approval-layout.test.ts` |
| Cover letter | `cover-letter.test.ts`, `cover-letter-application-package.test.ts`, `cover-letter-pdf-preview.test.ts` |
| Company research | `company-context.test.ts`, `auto-company-context.test.ts`, `firecrawl-research.test.ts`, `research-progress.test.ts` |
| Application shell | `app-shell.test.ts`, `application-records.test.ts`, `application-package-ux.test.ts`, `workflow-paper-cuts.test.ts`, `jd.test.ts`, `files.test.ts`, `supabase.test.ts`, `enrichment.test.ts` |

Runner manifest: `tests/run-all.ts`.

## Policy: no milestone archaeology in tests

Do **not** add checks that:

- Assert `HANDOFF.md` / `ROADMAP.md` contain specific version strings (e.g. `"v0.9.16E documented"`).
- Pin exact `APP_VERSION` or `package.json` version literals (release process owns versions).

Relocate UX wiring checks into the **domain suite** for that surface (`app-shell`, `generate-flow`, `application-package-ux`, etc.). Do not create catch-all suites.

## Future consolidation (parked)

Safe next merges (not done in v0.9.8G):

- Parser-adjacent suites → single `parser.test.ts` (behavior-only checks already isolated).
- Export suites → `export.test.ts` (many shared document-model helpers).

## Source-grep audit (`readFileSync` + `.includes`)

Tests that read source files and assert substring presence. These guard **wiring contracts** (UI imports, forbidden helpers, schema columns) where unit-testing React/Next modules would be heavier than the value.

| Suite | Classification | Rationale |
|-------|----------------|-----------|
| `app-shell.test.ts` | **Keep** | Nav order, uploads/records shell, landing/profile wiring (replaces removed `ux-quick-wins`). |
| `application-records.test.ts` | **Keep** | Records page + generate section must reference application shell types and schema. |
| `application-package-ux.test.ts` | **Keep** | Application package section order and panel wiring. |
| `workflow-paper-cuts.test.ts` | **Keep** | Cross-page navigation and export helper usage. |
| `company-context.test.ts` | **Keep** | Schema migration, editor panel, generate section integration. |
| `auto-company-context.test.ts` | **Keep** | Combined generate flow + research module wiring. |
| `firecrawl-research.test.ts` | **Keep** | Research pipeline imports Firecrawl + cover-letter options. |
| `research-progress.test.ts` | **Keep** | Progress panel stages tied to ensure-for-generation. |
| `generate-flow.test.ts` | **Keep** | Generate page UX strings and base-resume preference wiring. |
| `generation-partial-failure.test.ts` | **Keep** | Partial failure UI on generate + records panels. |
| `cover-letter.test.ts` | **Keep** | Generation, revision, validation, and package wiring for cover letters. |
| `cover-letter-application-package.test.ts` | **Keep** | Package integration between resume preview and PDF route. |
| `cover-letter-pdf-preview.test.ts` | **Keep** | Shared PDF HTML path used by preview + export. |
| `gemini-retry.test.ts` | **Keep** | All Gemini entry points must use shared retry helper. |
| `forced-bullet-regeneration.test.ts` | **Keep** | Targeted rewrite API route + regeneration panel wiring. |
| `draft-inventory-safety.test.ts` | **Keep** | **Critical:** draft edit paths must not call inventory save helpers. |
| `resume-approve-validation.test.ts` | **Replace Later** | Could test approve client behavior via exported pure helpers. |
| `resume-pdf-export.test.ts` | **Replace Later** | Mix of pure export tests + source grep; grep part replaceable. |
| `resume-pdf-page-count.test.ts` | **Replace Later** | Tests `countPdfPages` in `pdf-export.ts`; route grep replaceable. |
| `resume-pdf-preview-overflow.test.ts` | **Replace Later** | Overflow badge could be component-level snapshot later. |
| `resume-export-delivery.test.ts` | **Replace Later** | Metrics reset + pure delivery logic already partially tested. |
| `resume-export-strategy.test.ts` | **Replace Later** | Strategy flags partially covered by model parity suite. |
| `resume-export-model-parity.test.ts` | **Replace Later** | Model parity is pure; route grep is redundant over time. |

**Removed (cleanup):** `ux-quick-wins.test.ts`, `inventory-edit-ux.test.ts`, `cover-letter-quality.test.ts` (merged into `cover-letter.test.ts`), `gemini-call-map.ts`, `CoverLetterQuickRevisionPanel.tsx`.

Manual QA: [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md).
