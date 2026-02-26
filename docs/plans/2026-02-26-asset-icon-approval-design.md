# Asset Icon Approval System

## Problem

The explorer currently displays all asset icons from metadata without verification. Any asset creator can set an arbitrary icon URL, which could be misleading or malicious. Only icons for verified/approved assets should be shown by default.

## Reference

Wallet PR #318 (commit 2b6e6f7) introduced `AssetIconApprovalManager` — a class that manages two sets of asset IDs:
- **verifiedIds**: fetched from a remote URL on startup (e.g. `https://arklabshq.github.io/asset-registry/mutinynet.json`), a simple JSON array of asset ID strings
- **approvedIds**: user-manually-approved assets, persisted in localStorage

An asset's icon is shown only if `isApproved(assetId)` returns true (i.e. it's in either set).

## Design

### Core: AssetIconApprovalManager (copied from wallet)

File: `src/lib/assetIconApproval.ts`

Copied verbatim from the wallet. Manages:
- `verifiedIds: Set<string>` — populated from remote URL, not persisted
- `approvedIds: Set<string>` — user overrides, persisted to localStorage
- `isApproved(assetId)` — returns true if in either set
- `isVerified(assetId)` — returns true if in verified set only
- `approve(assetId)` / `revoke(assetId)` — manual user control

### Integration: AssetIconApprovalContext

File: `src/contexts/AssetIconApprovalContext.tsx`

A React context provider that:
1. Instantiates `AssetIconApprovalManager` once (via `useRef`)
2. On mount, reads `VITE_VERIFIED_ASSETS_URL` env var and fetches the JSON array
3. Calls `manager.setVerifiedAssets(data)` with the result
4. Exposes the manager instance + a `refreshApproval` counter (state that increments on approve/revoke to trigger re-renders in consuming components)
5. Provides `useAssetIconApproval()` hook

### Component changes

**AssetBadge** (`src/components/UI/AssetBadge.tsx`):
- Import `useAssetIconApproval`
- Gate icon rendering on `isApproved(assetId)` in addition to existing `isSafeImageUrl` check

**AssetAmountDisplay** (`src/components/UI/AssetAmountDisplay.tsx`):
- Same gating as AssetBadge

**AssetDetails** (`src/components/Asset/AssetDetails.tsx`):
- Gate the header icon on `isApproved(assetId)`
- Add a "Show icon" / "Hide icon" toggle button when the asset has an icon but is NOT verified (i.e. `hasIcon && !isVerified(assetId)`)
- Toggle calls `approve()` or `revoke()` and triggers context refresh

### App.tsx

Wrap with `<AssetIconApprovalProvider>` inside the existing provider stack.

### Environment variable

- `VITE_VERIFIED_ASSETS_URL`: URL to fetch the verified assets JSON array. Optional — if not set, no assets are auto-verified (all icons hidden by default unless manually approved).
- Document in README and `.env.example`

### Behavior summary

| Asset state | Icon shown? |
|---|---|
| In verified list | Yes (always) |
| Not verified, user approved | Yes |
| Not verified, not approved | No (placeholder or nothing) |
| No icon in metadata | No (unchanged) |

### No env var set

When `VITE_VERIFIED_ASSETS_URL` is not configured, no assets are auto-verified. Icons are hidden by default. Users can still manually approve icons on the asset detail page.
