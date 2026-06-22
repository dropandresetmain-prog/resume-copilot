# Test Checklist — v0.9.8B Resume Generation Auto-Repair

## Auto-repair

- [ ] Generate with mock/live AI when model returns 5 roles — draft saves (not blocked)
- [ ] Application package shows amber **structure repair** banner with bullet list
- [ ] Resume status chip shows **Needs structure review**
- [ ] Work Experience has ≤4 roles after repair
- [ ] Each role has ≤4 bullets; total ≤13 where possible
- [ ] Dropped role evidence appears in Additional Experience when applicable

## Hard-block (should still fail)

- [ ] Empty work experience from model → generation error, no draft saved
- [ ] Missing Skills/Languages/Interests groups → generation error

## Regression

- [ ] Cover letter generation unchanged
- [ ] Inventory not mutated by repair
- [ ] `npm run test`, `npm run lint`, `npm run build` pass
