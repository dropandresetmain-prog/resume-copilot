# Test Checklist — v0.7.4 Additional Experience Normalization

## Generation validation

- [ ] Plain Additional Experience items (e.g. `BayCurrent Consulting – …`) do **not** block generation
- [ ] Multiple plain items combine under **Other Past Roles: …**
- [ ] Existing **Title: Detail** items are preserved unchanged
- [ ] Mixed colon + plain items normalize correctly
- [ ] PDF/preview still renders Additional Experience as **Title: Detail**
- [ ] Normalization emits a warning in draft risk flags (not a hard error)

## Regression

- [ ] Role count (max 4) and bullet count (2–4 per role) validation still hard-fails
- [ ] Skills group requirements unchanged
- [ ] Source/fact validation unchanged
