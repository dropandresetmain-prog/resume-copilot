# Roadmap

Lightweight product roadmap — avoid backlog bloat. See `HANDOFF.md` for current milestone details.

## Current milestone

**v0.7.3 — Generate Box UX Fix** (complete)

- One card: JD paste + base resume + Generate + progress
- Saved jobs separated by divider below primary action

## Previous

**v0.7.2 — Generate Flow UX Simplification**

- Paste JD → base resume → Generate Tailored Resume
- Auto-save/reuse job on generate
- Progress panel + last-used base resume preference

## Previous

**v0.7.1 — Layout Defaults & LLM Guardrails**

**v0.7.0 — One-Page Export Validation**

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
