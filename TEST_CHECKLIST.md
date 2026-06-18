# Test Checklist — v0.6.1 DOCX Export Fidelity Fixes

## Filename

- [ ] Export filename: `<Name> - Resume_<Company>_<Role>.docx`
- [ ] Fallback: `<Name> - Resume.docx`

## DOCX fidelity (manual in Word)

- [ ] Body font ~10pt (not ~8.5pt)
- [ ] Font is Gill Sans MT (or installed fallback), not Calibri/Times mix
- [ ] Location/date same font as body
- [ ] Company name bold; `(descriptor)` normal weight
- [ ] Work/education left/right rows align cleanly
- [ ] No Professional Summary section
- [ ] Compare against browser preview

## Preview page

- [ ] Approve → Download DOCX still works
- [ ] PDF placeholder still disabled

## Automated

- [ ] `npm run test:resume-docx-export` passes
- [ ] `npm run test` / `lint` / `build` pass
