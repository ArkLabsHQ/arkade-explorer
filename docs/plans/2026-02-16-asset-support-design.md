# Asset Support for Arkade Explorer

## Context

The Arkade protocol is adding asset support ([ts-sdk PR #279](https://github.com/arkade-os/ts-sdk/pull/279)). The explorer needs to surface asset data across its existing views and add a new asset detail page.

The SDK PR adds:
- `Asset` type (`{assetId, amount}`) on `VirtualCoin.assets`
- `AssetDetails` type (`{assetId, supply, metadata, controlAssetId}`)
- `KnownMetadata` (`{name, ticker, decimals, icon}`)
- `getAssetDetails(assetId)` on `RestIndexerProvider`
- `Packet` class for parsing OP_RETURN asset packets from transactions
- `VtxoAsset` on the indexer's raw VTXO response

## Decisions

- **SDK dependency**: Target PR #279 types directly (install from branch/git ref)
- **Route**: `/asset/:assetId`
- **Transaction parsing**: Parse OP_RETURN asset packet for rich detail, fall back to VTXO asset data
- **Amount formatting**: Separate `AssetAmountDisplay` component (keep `MoneyDisplay` pure BTC)
- **Asset page scope**: Asset details only (supply, metadata, control asset link). No VTXO listing by asset.
- **Caching**: Session storage + react-query for `AssetDetails` (metadata is stable/immutable)
- **Address stats**: Include per-asset balance aggregation when VTXOs carry assets

## Data Layer

### SDK Upgrade
- Install `@arkade-os/sdk` from PR #279 branch
- Remove the `WithAssetIndexerClient` override — the SDK's `RestIndexerProvider` natively returns `assets?: Asset[]` on `VirtualCoin` and exposes `getAssetDetails(assetId)`
- `indexer.ts` returns to plain `new RestIndexerProvider(INDEXER_URL)`

### Asset Cache Hook: `useAssetDetails(assetId)`
- New file: `src/hooks/useAssetDetails.ts`
- Wraps `indexerClient.getAssetDetails()` with a two-tier cache:
  1. **Session storage** — keyed by `asset-details:${assetId}`, stores serialized `AssetDetails`. Checked first.
  2. **React-query** — `queryKey: ['asset-details', assetId]`, `staleTime: Infinity`. Only fetches if session storage misses.
- Returns `{ assetDetails: AssetDetails | null, isLoading, error }`
- Companion `getAssetDetailsFromCache(assetId)` sync function reads session storage directly for synchronous formatting

### Type Re-exports
- Re-export `Asset`, `AssetDetails`, `AssetMetadata`, `KnownMetadata` from SDK through `src/lib/api/indexer.ts` (matching existing re-export pattern)

## New Components

### `AssetAmountDisplay`
- File: `src/components/UI/AssetAmountDisplay.tsx`
- Props: `{ amount: number, assetId: string, className?: string }`
- Calls `useAssetDetails(assetId)` internally for metadata
- Formats amount using `decimals` from metadata (`amount / 10^decimals`), displays `ticker` as unit label
- Loading state: raw amount with subtle shimmer on unit
- No metadata fallback: raw amount + truncated assetId
- Ticker/name is a clickable link to `/asset/:assetId`
- Shows small icon next to ticker if `icon` is present in metadata

### `AssetBadge`
- File: `src/components/UI/AssetBadge.tsx`
- Compact inline badge: icon + ticker (or truncated assetId)
- Clickable — links to `/asset/:assetId`
- Used in `VtxoList` and `TransactionDetails`

### Asset Page
- `src/pages/AssetPage.tsx` — route handler, fetches via `useAssetDetails(assetId)`
- `src/components/Asset/AssetDetails.tsx` — renders detail card:
  - Header: icon + name (or assetId if no name)
  - Rows: Asset ID (copyable), Ticker, Decimals, Total Supply (formatted), Control Asset (link if present)
  - Raw Metadata: expandable debug section (matching existing debug toggle pattern)

## Modifications to Existing Components

### `VtxoList.tsx`
- `Vtxo` type now has `assets?: Asset[]` natively from SDK
- For VTXOs with `assets.length > 0`: render `AssetBadge` per asset + `AssetAmountDisplay` for asset amounts
- BTC `MoneyDisplay` continues unchanged — VTXOs always carry a sats value
- Asset badges appear in a row below the existing amount row

### `TransactionDetails.tsx`
- **OP_RETURN packet parsing**: Detect OP_RETURN outputs with `Packet.isAssetPacket(script)`. Parse with `Packet.fromScript(script)` to get asset groups.
- **Asset group display**: Per `AssetGroup` show asset ID (`AssetBadge`), input mappings (which tx inputs, amounts), output mappings (which tx outputs, amounts)
- **Fallback**: If packet parsing fails, show asset info from VTXO data (`vtxoData[i].assets`)
- **Existing outputs**: VTXOs with assets get `AssetBadge` + `AssetAmountDisplay` alongside `MoneyDisplay`

### `AddressStats.tsx`
- After existing BTC balance cards, add asset balances section
- Group VTXOs by `assetId`:
  - Active balance: sum `asset.amount` on non-spent VTXOs
  - Total received: sum `asset.amount` on all VTXOs
- Each asset rendered as row: `AssetBadge` + active balance + total received via `AssetAmountDisplay`
- Section only shown if any VTXOs carry assets
- Uses `useAssetDetails` per unique assetId (session cache prevents redundant fetches)

### `App.tsx`
- Add route: `<Route path="asset/:assetId" element={<AssetPage />} />`

### `src/lib/api/indexer.ts`
- Remove `WithAssetIndexerClient` override, revert to plain `RestIndexerProvider`
- Add re-exports for new SDK asset types

### `package.json`
- SDK version bump to PR #279 branch ref

## File Inventory

### New Files (5)
| File | Purpose |
|------|---------|
| `src/pages/AssetPage.tsx` | Route handler for `/asset/:assetId` |
| `src/components/Asset/AssetDetails.tsx` | Asset detail card rendering |
| `src/components/UI/AssetAmountDisplay.tsx` | Asset amount formatting with metadata |
| `src/components/UI/AssetBadge.tsx` | Compact inline asset tag |
| `src/hooks/useAssetDetails.ts` | Fetch + session storage cache for AssetDetails |

### Modified Files (6)
| File | Change |
|------|--------|
| `src/lib/api/indexer.ts` | Remove override, re-export SDK asset types |
| `src/App.tsx` | Add `/asset/:assetId` route |
| `src/components/Address/VtxoList.tsx` | Show assets on VTXOs |
| `src/components/Address/AddressStats.tsx` | Per-asset balance aggregation |
| `src/components/Transaction/TransactionDetails.tsx` | Parse asset packets, show asset groups |
| `package.json` | SDK version bump |

### Not Changed
- `MoneyDisplay` / `MoneyDisplayContext` — stays pure BTC
- `HomePage` / search — no asset search capability
- No new external packages beyond SDK upgrade
