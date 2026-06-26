# Phase 0 Manual QA Checklist

**Milestone:** v0.9.17A Prompt & Payload Hygiene  
**Type:** Live Gemini quality comparison (optional but recommended)  
**Note:** Automated suites verify prompt contracts only. This checklist validates tailoring behavior.

## Setup

1. Use the same inventory and reference resume for before/after runs.
2. Run **combined Generate** (resume + cover letter) with company website research enabled when testing company-context positioning.
3. Compare the latest build against a pre–Phase 0 baseline if available; otherwise compare two runs on different JDs and note regressions.

## JD scenarios (run each)

| # | Scenario | What to verify |
|---|----------|----------------|
| 1 | Strong Work Experience match | Top roles/bullets still JD-specific; metrics unchanged; strongest evidence selected |
| 2 | Additional Experience should matter | Additional lines still available in input; rationale may note them even if not in Work Experience |
| 3 | Company context affects positioning | `rationale.toneNotes` / `positioningAngle` reference hiring priorities or angles; **no** invented company claims in bullets |
| 4 | Unsupported requirements / gaps | `rationale.omissions` / `honestGaps` name unsupported asks; no fabricated credentials |
| 5 | Technical / AI wording risk | No unsupported “software engineer” or ML authority; risk flags when thin |

## Per-scenario checks

For each generated resume draft:

- [ ] Strongest evidence still appears in Work Experience (not displaced by filler)
- [ ] Metrics in bullets match inventory (no invented or rounded-up numbers)
- [ ] No new employers, titles, or tools not in inventory
- [ ] Bullets read JD-specific (reframed), not keyword-stuffed
- [ ] `rationale.selectionAudit.strongestMatches` names real inventory strengths
- [ ] `rationale.selectionAudit.honestGaps` or `omissions` present when JD asks for missing skills
- [ ] Company context improved **framing** without unsupported admiration in bullets
- [ ] Structure still valid: ≤4 roles, 2–4 bullets/role, empty professional summary, Skills/Languages/Interests groups

For each generated cover letter:

- [ ] Reads as a hiring argument, not a resume walkthrough
- [ ] At least two company-specific facts (not generic mission praise)
- [ ] At least two role-specific JD requirements referenced
- [ ] No URLs in prose; no `[Candidate Name]` placeholder
- [ ] Word count ≤ 420

## Pass / fail

- **Pass:** No factuality regressions; positioning equal or better; structure unchanged.
- **Fail:** Invented metrics/employers, lost strongest evidence, generic company admiration only, or structure validation errors.

## If live Gemini is not run

Mark release as **contract-tested only; live quality QA pending** in HANDOFF or release notes.
