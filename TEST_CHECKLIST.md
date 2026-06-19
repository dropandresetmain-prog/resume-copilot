# Test Checklist — v0.6.3 Preview/PDF Layout Parity

## Name

- [ ] Preview shows candidate name in FULL CAPS
- [ ] PDF shows same uppercase name
- [ ] DOCX shows same uppercase name
- [ ] Stored profile data unchanged (mixed case in DB)

## Preview vs PDF parity

- [ ] Line spacing matches preview sliders in PDF
- [ ] Section spacing matches preview sliders in PDF
- [ ] Bullet spacing compact and aligned with preview
- [ ] Work/education row spacing matches preview
- [ ] No obviously looser PDF layout vs preview

## Settings persistence

- [ ] Adjust sliders → Approve → reload preview → sliders restored
- [ ] Records → Download PDF uses approved settings (not optimizer defaults)
- [ ] Preview page live export uses current slider values

## Export buttons

- [ ] DOCX/PDF open in new tab

## Automated

- [ ] `npm run test:resume-layout-parity` passes
- [ ] `npm run test` / `lint` / `build` pass
