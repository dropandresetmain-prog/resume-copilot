# Career Vault

Route: **`/inventory`** → `InventoryPageClient` (`src/components/pages/InventoryPageClient.tsx`).

Nav label: **Career vault**. This is the persisted career-inventory workspace used to review source resumes, parsed evidence, enrichment, and non-destructive edit overlays.

The Folio-only **`CareerVaultPageClient`** remains in the repo for reference but is not mounted. It did not expose the established enrichment, overlay editing, cleanup, or source-resume workflows.

## Restoration contract

The restored route reuses the existing workspace and persistence handlers. It does not introduce a second inventory model or change generation inputs.

1. **Trust states** — loading, signed-out, failed load, empty, partially parsed, and parser/storage warnings are distinguishable.
2. **Source upload** — `UploadCard` uses `handleFilesSelected` for DOCX parsing, inventory persistence, and private source-file storage.
3. **Staged text extraction** — extract → review/edit → apply; extraction alone does not save.
4. **Enrichment review** — suggestions remain reviewable and resolutions use the established enrichment state.
5. **User-directed cleanup** — duplicate and project cleanup update the existing `InventoryEdits` overlay.
6. **Inventory tabs** — collated overview, edit overlays, and per-resume parsed source audit remain accessible.

## Workspace integration

All reads and mutations flow through `useWorkspace()`:

| Handler / state | Purpose |
|---|---|
| `inventory`, `collated`, `warnings` | Persisted source model, active overlay view, and parser warnings |
| `isWorkspaceLoading`, `inventoryLoadError` | Prevent pre-auth or failed loads from appearing as trustworthy empty inventory |
| `handleFilesSelected` | Validate and parse DOCX files, upsert parsed inventory, and store source files |
| `handleSaveInventoryEdits` | Persist overlay edits and optional enrichment changes |
| enrichment handlers | Run enrichment and resolve reviewable suggestions |
| `handleClearResumeInventory` | Confirm and clear resume inventory without touching saved jobs |

Inventory draft UI is keyed by authenticated user ID. This prevents an unsaved overlay from surviving an identity change when two users happen to have similar saved data.

## Persistence and source-of-truth rules

- Parsed source resumes are not mutated by inventory edits.
- `InventoryEdits` remains the non-destructive overlay used by active collation and generation.
- Add-from-Text applies accepted suggestions only after explicit Apply.
- Project-like extracted items route to Additional Experience; existing polluted overlays require user-reviewed cleanup.
- Preview-only education suggestions cannot be accepted or presented as saved.
- Upload presence is not parse success. Parser failures and warnings remain visible.
- Important edit saves show progress, success, and failure; unsaved edits register a reload warning.
- Direct reload waits for auth resolution and persisted inventory loading before deciding the vault is empty.

## Unmounted Folio presentation

`CareerVaultPageClient` retains the Folio tab/card presentation and per-resume application-count query as reference. Restoring those visuals on top of the persisted workspace is optional future presentation work, not part of this restoration milestone.

## Related modules

| Module | Role |
|---|---|
| `src/components/pages/InventoryPageClient.tsx` | Mounted Career Vault workspace |
| `src/components/setup/InventoryTextExtractionPanel.tsx` | Paste → extract → review → apply |
| `src/components/setup/EnrichmentReviewPanel.tsx` | Reviewable enrichment suggestions |
| `src/components/setup/InventoryEditPanel.tsx` | Non-destructive edit overlay |
| `src/components/setup/InventoryDuplicateCleanupPanel.tsx` | User-directed duplicate cleanup |
| `src/components/setup/InventoryProjectCleanupPanel.tsx` | User-directed project pollution cleanup |
| `src/components/setup/SourceResumesView.tsx` | Per-resume parsed audit |
| `src/components/app/WorkspaceProvider.tsx` | Auth-scoped loading, persistence, and inventory handlers |
| `src/lib/inventory/edits.ts` | Overlay normalization and application |
| `src/lib/inventory/collation.ts` | Parsed-source collation |
| `src/lib/supabase/resume-inventories.ts` | Persisted inventory source |
