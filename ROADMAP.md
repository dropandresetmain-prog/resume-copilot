# Roadmap

Lightweight product roadmap — avoid backlog bloat. See `HANDOFF.md` for current milestone details.

## Current milestone

**v0.7.0 — One-Page Export Validation** (complete)

- `pdf-lib` page count on generated PDF buffers
- Approve-time server validation; `serverPdfValidation` on draft content
- PDF export hard 422 gate when `pageCount > 1`
- UI: server vs heuristic layout status

## Previous

**v0.6.8 — Export Delivery & Filename Stabilization** — blob download, signed URL filename, single delivery action.

**v0.6.7 — PDF Preview Truth Patch** — overflow measurement, no silent clip.

## Next (optional)

**PDF density / underfill warnings** — warn when one-page PDF uses page poorly (no auto-expand yet).

**Cover letter generation** — after one-page foundation stable.

## Build after one-page

| Item | Notes |
|------|--------|
| Hybrid content compression | Evidence-backed, user-visible diffs — not AI auto-shrink |
| Full fit rubric (`fit-rubric-v1`) | Replace `preview-fit-heuristic-v1` |
| Bundled web font | Reduce preview vs server line-break drift |
| Reference format extraction | Font/size from DOCX OOXML |
| Manual inventory editing | Deferred |

## Future vision only

- HTML→DOCX unified renderer
- Email export delivery
- Visual PDF regression tests in CI
