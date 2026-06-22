# Test Checklist — v0.8.0 Application Shell

## Generate → Application link

- [ ] Sign in with inventory uploaded
- [ ] Paste JD on Generate → **Generate Tailored Resume**
- [ ] Draft saves and opens in preview
- [ ] Records → Applications shows new application for that job
- [ ] Application status is **Resume generated**
- [ ] **Open latest draft** opens the new draft
- [ ] Draft History does **not** duplicate the linked draft (shows unlinked only)

## Application management

- [ ] Change status (e.g. Ready to apply, Applied)
- [ ] Add notes → **Save notes** → refresh page → notes persist
- [ ] Job URL link visible when JD has `jobUrl`
- [ ] Generate again for same JD reuses application; new draft links to same application
- [ ] Application card shows latest draft by `updated_at`

## Backwards compatibility

- [ ] Pre-existing drafts without `application_id` still appear in Draft History
- [ ] Delete unlinked draft still works
- [ ] Approve / export flow unchanged for linked drafts

## Regression

- [ ] Inventory edits (v0.7.8)
- [ ] Regeneration on resume preview
- [ ] `npm run test` passes

## Parked (not in v0.8.0)

- [ ] Cover letter generation
- [ ] Lazy backfill application records for old drafts
- [ ] Applied timestamp UI beyond status change
