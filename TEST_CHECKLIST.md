# Test Checklist — v0.7.5 Skills & Interests Cleanup

## Skills & Interests structure

- [ ] Preview/PDF/DOCX show **Skills:** (technical only), **Languages:**, **Interests:**
- [ ] No **Tech:** row
- [ ] No separate soft/business **Skills:** row (Business Development, Negotiation, etc.)
- [ ] Legacy drafts with Tech + soft Skills groups still render technical items under **Skills** only
- [ ] `Python (basic automation & data handling)` renders as **Python**

## Regression

- [ ] Work Experience bullets unchanged
- [ ] Additional Experience normalization (v0.7.4) still works
- [ ] Generation validation still requires Skills, Languages, Interests groups
