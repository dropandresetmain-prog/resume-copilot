# Test Checklist — v0.7.6 Generation Input Quality

## Generation payload

- [ ] Bullets in Gemini input include `keyword`, `description`, `acceptedWording` (when reviewed), `sourceCitations`, `bulletKey`, `dateRange`
- [ ] Accepted enrichment wording appears in payload but does not mutate inventory
- [ ] Recent/current role bullets survive low caps better than legacy collation-order cap
- [ ] `auditHints` shows cap, included/omitted counts, JD term sample

## Prompt

- [ ] Distinguishes bullet-level keywords vs advisory `approvedKeywords` vs JD terms
- [ ] Instructs Gemini to prefer `acceptedWording` when truthful
- [ ] `rationale.selectionAudit` schema documented in prompt

## Regression

- [ ] Generation validation still passes
- [ ] Skills & Interests cleanup (v0.7.5) unchanged
- [ ] Additional experience normalization (v0.7.4) unchanged
