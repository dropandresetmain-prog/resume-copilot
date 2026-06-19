# HANDOFF

## Current milestone

**v0.6.6 — Resume Generation Rules & Approval Formatting Fixes**

Production stabilization: larger layout font ceiling (~20px / 15pt), stricter Work Experience bullet-count generation rules, re-approval required after post-approval layout edits, clearer DOCX warning.

## Product flow

```
Paste JD → Generate → Review → PDF Preview (truth) → Approve → Download PDF (primary) / DOCX (secondary)
```

If layout changes after approval → status `layout_changed` → re-approve before export.

## v0.6.6 highlights

- Body font slider max raised to **20px** (~15pt)
- Generation prompt: max 4 roles, 2–4 bullets/role, ~12–13 total bullets, BayCurrent rule
- Post-approval layout edits set `layout_changed`; downloads disabled until re-approve
- DOCX download warning: editable / may exceed one page; PDF is final layout

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.5 — Preview truth & mobile export | Complete |
| **v0.6.6 — Generation rules & approval formatting** | **Current** |
| v0.7.0 — One-page enforcement foundation | Next (recommended) |
| Cover letter generation | After one-page foundation |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
