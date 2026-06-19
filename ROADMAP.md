# Roadmap

Lightweight product roadmap — avoid backlog bloat. See `HANDOFF.md` for current milestone details.

## Current milestone

**v0.6.6 — Resume Generation Rules & Approval Formatting Fixes** (complete)

- Body font slider max 20px (~15pt)
- Work Experience generation bullet-count rules in prompt
- Re-approval required after post-approval layout edits (`layout_changed` status)
- DOCX reflow warning on preview page

## Previous

**v0.6.5 — Preview Truth & Mobile Export Stabilization** — PDF Preview authoritative, export model parity, mobile A4 preview, mobile export navigation.

## Next milestone

**v0.7.0 — One-page enforcement foundation** (recommended before cover letters)

- Puppeteer page-count validation (truth surface for one-page)
- Calibrate `estimatePageFit` against print CSS / Puppeteer
- Hybrid content compression pipeline (evidence-backed, user-visible diffs)
- Block or gate export when PDF exceeds one page (after validation exists)

## Build after export fidelity / one-page

| Item | Notes |
|------|--------|
| Cover letter generation | Reuse document model patterns; deferred from v0.7 until one-page gate |
| Reference format extraction | Font/size from DOCX OOXML or style map — parser is text-only today |
| Full fit rubric (`fit-rubric-v1`) | Replace `preview-fit-heuristic-v1`; see `docs/FIT_SCORE_RUBRIC.md` |
| Manual inventory editing | Deferred; must not mutate from draft flows |

## Future vision only

- HTML→DOCX or unified renderer (high cost)
- Email export delivery
- Visual PDF regression tests in CI
- Layout presets UI (parked — sliders + optimizer sufficient for now)

## Long-term vision

Evidence-backed tailored resumes: inventory SOT → ranked selection → verified one-page PDF → optional editable DOCX → job-specific cover letters → full qualification fit rubric.
