# Asset Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add asset support to the Arkade Explorer — new asset detail page, asset display on VTXOs and transactions, session-cached metadata, and per-asset balance aggregation.

**Architecture:** Install `@arkade-os/sdk` from PR #279 branch which adds `Asset`, `AssetDetails`, `Packet` types and `getAssetDetails()` on the indexer. Build a `useAssetDetails` hook with session storage + react-query caching. Create `AssetBadge` and `AssetAmountDisplay` components, then integrate into existing views. Parse OP_RETURN asset packets in transactions with VTXO fallback.

**Tech Stack:** React 18, TypeScript, React Router v7, TanStack React Query, Tailwind CSS v4, `@arkade-os/sdk` (PR #279 branch), `@scure/btc-signer`

**Design doc:** `docs/plans/2026-02-16-asset-support-design.md`

---

### Task 1: SDK Upgrade & Type Re-exports

**Files:**
- Modify: `package.json` (line 13 — SDK version)
- Modify: `src/lib/api/indexer.ts` (all 17 lines — add re-exports)

**Step 1: Install SDK from PR #279 branch**

Run:
```bash
npm install @arkade-os/sdk@npm:@anthropic-ai/sdk@github:arkade-os/ts-sdk#asset
```

> **Note:** The exact install command depends on how the PR branch is published. If the branch isn't directly installable, try:
> ```bash
> npm install github:arkade-os/ts-sdk#asset
> ```
> Verify the installed version has `AssetDetails` type:
> ```bash
> grep -r "AssetDetails" node_modules/@arkade-os/sdk/dist/types/
> ```
> If neither works, the SDK may need to be built from the branch first. Ask the user for the correct install ref.

**Step 2: Update type re-exports in indexer.ts**

Replace the entire contents of `src/lib/api/indexer.ts` with:

```typescript
import { RestIndexerProvider, RestArkProvider, type VirtualCoin } from '@arkade-os/sdk';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || 'https://arkade.computer';
const ARK_URL = import.meta.env.VITE_ARK_URL || 'https://arkade.computer';

export const indexerClient = new RestIndexerProvider(INDEXER_URL);
export const arkClient = new RestArkProvider(ARK_URL);

// Re-export types from SDK for convenience
export type { Outpoint, CommitmentTx, BatchInfo, PageResponse, VirtualCoin } from '@arkade-os/sdk';

// Alias BatchInfo as Batch for backward compatibility
export type { BatchInfo as Batch } from '@arkade-os/sdk';

// Alias VirtualCoin as Vtxo for backward compatibility
export type Vtxo = VirtualCoin;

// Asset types from SDK
export type { Asset, AssetDetails, AssetMetadata, KnownMetadata } from '@arkade-os/sdk';
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors (the new types should be available from the SDK)

**Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/api/indexer.ts
git commit -m "feat: upgrade SDK to asset branch and add asset type re-exports"
```

---

### Task 2: Asset Details Cache Hook

**Files:**
- Create: `src/hooks/useAssetDetails.ts`

**Step 1: Create the hook**

Create `src/hooks/useAssetDetails.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { indexerClient } from '../lib/api/indexer';
import type { AssetDetails } from '../lib/api/indexer';

const CACHE_PREFIX = 'asset-details:';

function readFromSessionStorage(assetId: string): AssetDetails | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + assetId);
    if (!raw) return null;
    return JSON.parse(raw) as AssetDetails;
  } catch {
    return null;
  }
}

function writeToSessionStorage(assetId: string, details: AssetDetails): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + assetId, JSON.stringify(details));
  } catch {
    // Session storage full or unavailable — ignore
  }
}

/**
 * Synchronous read from session storage cache.
 * Returns null if not cached. Useful for formatting without suspending.
 */
export function getAssetDetailsFromCache(assetId: string): AssetDetails | null {
  return readFromSessionStorage(assetId);
}

/**
 * Hook to fetch and cache asset details.
 * Two-tier cache: session storage (persists across page nav) + react-query (in-memory dedup).
 */
export function useAssetDetails(assetId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['asset-details', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('No assetId');

      // Check session storage first
      const cached = readFromSessionStorage(assetId);
      if (cached) return cached;

      // Fetch from indexer
      const details = await indexerClient.getAssetDetails(assetId);
      writeToSessionStorage(assetId, details);
      return details;
    },
    enabled: !!assetId,
    staleTime: Infinity, // Asset metadata is immutable
    retry: 1,
  });

  return {
    assetDetails: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useAssetDetails.ts
git commit -m "feat: add useAssetDetails hook with session storage cache"
```

---

### Task 3: AssetBadge Component

**Files:**
- Create: `src/components/UI/AssetBadge.tsx`

**Step 1: Create the component**

Create `src/components/UI/AssetBadge.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useAssetDetails } from '../../hooks/useAssetDetails';
import { truncateHash } from '../../lib/utils';

interface AssetBadgeProps {
  assetId: string;
  className?: string;
}

export function AssetBadge({ assetId, className = '' }: AssetBadgeProps) {
  const { assetDetails } = useAssetDetails(assetId);
  const metadata = assetDetails?.metadata;
  const label = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);

  return (
    <Link
      to={`/asset/${assetId}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase
        bg-arkade-purple/20 border border-arkade-purple text-arkade-purple
        hover:bg-arkade-purple hover:text-white transition-colors ${className}`}
      title={assetId}
    >
      {metadata?.icon && (
        <img src={metadata.icon} alt="" className="w-3.5 h-3.5 rounded-full" />
      )}
      <span>{label}</span>
    </Link>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/UI/AssetBadge.tsx
git commit -m "feat: add AssetBadge component"
```

---

### Task 4: AssetAmountDisplay Component

**Files:**
- Create: `src/components/UI/AssetAmountDisplay.tsx`

**Step 1: Create the component**

Create `src/components/UI/AssetAmountDisplay.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useAssetDetails } from '../../hooks/useAssetDetails';
import { truncateHash } from '../../lib/utils';

interface AssetAmountDisplayProps {
  amount: number;
  assetId: string;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
}

function formatAssetAmount(amount: number, decimals: number): string {
  if (decimals === 0) return amount.toLocaleString('en-US');
  const divisor = Math.pow(10, decimals);
  const formatted = (amount / divisor).toFixed(decimals);
  // Add thousand separators to the integer part
  const [intPart, decPart] = formatted.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

export function AssetAmountDisplay({
  amount,
  assetId,
  className = '',
  valueClassName = '',
  unitClassName = '',
}: AssetAmountDisplayProps) {
  const { assetDetails, isLoading } = useAssetDetails(assetId);
  const metadata = assetDetails?.metadata;
  const decimals = metadata?.decimals ?? 0;
  const ticker = metadata?.ticker || metadata?.name || truncateHash(assetId, 6, 6);
  const formatted = formatAssetAmount(amount, decimals);

  return (
    <span className={className}>
      <span className={valueClassName}>{formatted}</span>
      <Link
        to={`/asset/${assetId}`}
        className={`${unitClassName} hover:underline ${isLoading ? 'animate-pulse' : ''}`}
        title={assetId}
      >
        {' '}{metadata?.icon && (
          <img src={metadata.icon} alt="" className="inline w-3.5 h-3.5 rounded-full mr-0.5 align-text-bottom" />
        )}
        {ticker}
      </Link>
    </span>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/UI/AssetAmountDisplay.tsx
git commit -m "feat: add AssetAmountDisplay component"
```

---

### Task 5: Asset Page

**Files:**
- Create: `src/components/Asset/AssetDetails.tsx`
- Create: `src/pages/AssetPage.tsx`
- Modify: `src/App.tsx` (lines 6, 36 — add import and route)

**Step 1: Create AssetDetails component**

Create directory and file `src/components/Asset/AssetDetails.tsx`:

```tsx
import { useState } from 'react';
import { Card } from '../UI/Card';
import { Link } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard, truncateHash } from '../../lib/utils';
import type { AssetDetails as AssetDetailsType } from '../../lib/api/indexer';

interface AssetDetailsProps {
  assetDetails: AssetDetailsType;
}

function formatSupply(supply: number, decimals: number): string {
  if (decimals === 0) return supply.toLocaleString('en-US');
  const divisor = Math.pow(10, decimals);
  return (supply / divisor).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function AssetDetailsCard({ assetDetails }: AssetDetailsProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const metadata = assetDetails.metadata;
  const name = metadata?.name || truncateHash(assetDetails.assetId, 12, 12);
  const ticker = metadata?.ticker;
  const decimals = metadata?.decimals ?? 0;

  const handleCopyId = () => {
    copyToClipboard(assetDetails.assetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Card glowing>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {metadata?.icon && (
            <img src={metadata.icon} alt="" className="w-10 h-10 rounded-full" />
          )}
          <h1 className="text-2xl font-bold text-arkade-purple uppercase">{name}</h1>
          {ticker && (
            <span className="text-arkade-gray text-lg font-mono uppercase">({ticker})</span>
          )}
        </div>

        {/* Asset ID */}
        <div className="border-b border-arkade-purple pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-arkade-gray uppercase text-sm font-bold">Asset ID</span>
            <button
              onClick={handleCopyId}
              className="p-1 hover:text-arkade-purple transition-colors flex-shrink-0"
              title="Copy to clipboard"
            >
              {copiedId ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={handleCopyId}
            className="text-arkade-gray font-mono text-xs sm:text-sm hover:text-arkade-purple transition-colors cursor-pointer break-all w-full text-left"
            title="Click to copy"
          >
            {assetDetails.assetId}
          </button>
        </div>

        {/* Ticker */}
        {ticker && (
          <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
            <span className="text-arkade-gray uppercase text-sm font-bold">Ticker</span>
            <span className="text-arkade-gray font-mono">{ticker}</span>
          </div>
        )}

        {/* Decimals */}
        <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
          <span className="text-arkade-gray uppercase text-sm font-bold">Decimals</span>
          <span className="text-arkade-gray font-mono">{decimals}</span>
        </div>

        {/* Total Supply */}
        <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
          <span className="text-arkade-gray uppercase text-sm font-bold">Total Supply</span>
          <span className="text-arkade-gray font-mono">
            {formatSupply(assetDetails.supply, decimals)}
            {ticker && <span className="text-arkade-gray text-xs ml-1">{ticker}</span>}
          </span>
        </div>

        {/* Control Asset */}
        {assetDetails.controlAssetId && (
          <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
            <span className="text-arkade-gray uppercase text-sm font-bold">Control Asset</span>
            <Link
              to={`/asset/${assetDetails.controlAssetId}`}
              className="text-arkade-purple hover:text-arkade-orange font-mono text-sm transition-colors"
            >
              {truncateHash(assetDetails.controlAssetId, 8, 8)}
            </Link>
          </div>
        )}

        {/* Debug: raw metadata */}
        <div className="pt-4 border-t border-arkade-gray/20">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-arkade-gray hover:text-arkade-purple text-xs uppercase font-bold transition-colors"
          >
            {showDebug ? '▼ Hide' : '▶ Show'} Raw Metadata
          </button>
          {showDebug && (
            <pre className="mt-2 p-2 bg-arkade-black/50 rounded text-xs overflow-x-auto">
              <code className="text-arkade-gray">
                {JSON.stringify(assetDetails, null, 2)}
              </code>
            </pre>
          )}
        </div>
      </div>
    </Card>
  );
}
```

**Step 2: Create AssetPage**

Create `src/pages/AssetPage.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { useAssetDetails } from '../hooks/useAssetDetails';
import { AssetDetailsCard } from '../components/Asset/AssetDetails';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';

export function AssetPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { assetDetails, isLoading, error } = useAssetDetails(assetId);

  if (!assetId) {
    return <ErrorMessage message="No asset ID provided" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Failed to load asset: ${error.message}`} />;
  }

  if (!assetDetails) {
    return <ErrorMessage message="Asset not found" />;
  }

  return (
    <div className="space-y-6">
      <AssetDetailsCard assetDetails={assetDetails} />
    </div>
  );
}
```

**Step 3: Add route to App.tsx**

In `src/App.tsx`:

- Add import at line 7 (after `CommitmentTxPage` import):
  ```typescript
  import { AssetPage } from './pages/AssetPage';
  ```

- Add route at line 37 (before the catch-all `*` route):
  ```tsx
  <Route path="asset/:assetId" element={<AssetPage />} />
  ```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/Asset/AssetDetails.tsx src/pages/AssetPage.tsx src/App.tsx
git commit -m "feat: add asset detail page with route"
```

---

### Task 6: Add Assets to VtxoList

**Files:**
- Modify: `src/components/Address/VtxoList.tsx` (lines 107-115 — after Amount row)

**Step 1: Add asset imports**

At the top of `src/components/Address/VtxoList.tsx`, add imports:

```typescript
import { AssetBadge } from '../UI/AssetBadge';
import { AssetAmountDisplay } from '../UI/AssetAmountDisplay';
```

**Step 2: Add asset display after the Amount row**

In `src/components/Address/VtxoList.tsx`, after the Amount `<div>` block (around line 115, after the closing `</div>` of the Amount flex container), add:

```tsx
{vtxo.assets && vtxo.assets.length > 0 && (
  <div className="space-y-1">
    <span className="text-arkade-gray uppercase text-xs sm:text-sm">Assets:</span>
    <div className="flex flex-wrap gap-2 ml-2">
      {vtxo.assets.map((asset, assetIdx) => (
        <div key={assetIdx} className="flex items-center gap-2">
          <AssetBadge assetId={asset.assetId} />
          <AssetAmountDisplay
            amount={asset.amount}
            assetId={asset.assetId}
            valueClassName={`${moneyColor} font-bold font-mono text-xs sm:text-sm`}
            unitClassName={`${moneyColor} font-mono text-xs sm:text-sm`}
          />
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors. The `vtxo.assets` field comes from the SDK's `VirtualCoin` type which now includes `assets?: Asset[]`.

**Step 4: Commit**

```bash
git add src/components/Address/VtxoList.tsx
git commit -m "feat: display assets on VTXOs in address view"
```

---

### Task 7: Add Asset Balances to AddressStats

**Files:**
- Modify: `src/components/Address/AddressStats.tsx` (add after existing grid)

**Step 1: Add imports**

At the top of `src/components/Address/AddressStats.tsx`, add:

```typescript
import { AssetBadge } from '../UI/AssetBadge';
import { AssetAmountDisplay } from '../UI/AssetAmountDisplay';
```

**Step 2: Add asset balance computation and rendering**

After the existing computed values (`totalBalance`, `totalReceived`), around line 17, add the asset aggregation logic:

```typescript
// Aggregate asset balances
const assetBalances = new Map<string, { active: number; total: number }>();
vtxos.forEach((v) => {
  const isActive = !(v.spentBy && v.spentBy !== '') && !(v as any).isSpent;
  v.assets?.forEach((asset) => {
    const existing = assetBalances.get(asset.assetId) || { active: 0, total: 0 };
    existing.total += asset.amount;
    if (isActive) existing.active += asset.amount;
    assetBalances.set(asset.assetId, existing);
  });
});
const hasAssets = assetBalances.size > 0;
```

After the closing `</div>` of the existing grid (line 63), add:

```tsx
{hasAssets && (
  <div className="mt-4 space-y-2">
    <h3 className="text-sm font-bold text-arkade-purple uppercase">Asset Balances</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from(assetBalances.entries()).map(([assetId, balances]) => (
        <Card key={assetId}>
          <div className="space-y-2">
            <AssetBadge assetId={assetId} />
            <div className="flex items-center justify-between">
              <span className="text-arkade-gray uppercase text-xs">Balance</span>
              <AssetAmountDisplay
                amount={balances.active}
                assetId={assetId}
                valueClassName={`${mypurple} font-bold font-mono text-sm`}
                unitClassName="text-arkade-gray text-xs"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-arkade-gray uppercase text-xs">Received</span>
              <AssetAmountDisplay
                amount={balances.total}
                assetId={assetId}
                valueClassName="text-arkade-gray font-mono text-sm"
                unitClassName="text-arkade-gray text-xs"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
)}
```

The component's return statement should now wrap both the existing grid and the new asset section. Change the return to:

```tsx
return (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* ...existing BTC cards... */}
    </div>

    {hasAssets && (
      <div className="mt-4 space-y-2">
        {/* ...asset balances section... */}
      </div>
    )}
  </>
);
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/Address/AddressStats.tsx
git commit -m "feat: add per-asset balance aggregation to address stats"
```

---

### Task 8: Add Asset Packet Parsing to TransactionDetails

**Files:**
- Modify: `src/components/Transaction/TransactionDetails.tsx`

This is the most complex task. We need to:
1. Import `Packet` and `AssetBadge`/`AssetAmountDisplay`
2. After parsing the PSBT, scan outputs for OP_RETURN asset packets
3. Display parsed asset groups
4. Show asset info on individual outputs from VTXO data as fallback

**Step 1: Add imports**

At the top of `src/components/Transaction/TransactionDetails.tsx`, add:

```typescript
import { asset } from '@arkade-os/sdk';
import { AssetBadge } from '../UI/AssetBadge';
import { AssetAmountDisplay } from '../UI/AssetAmountDisplay';
```

**Step 2: Add asset packet parsing**

After the existing PSBT parsing block (around line 186, after `parsedTx` is set for arkade type), add:

```typescript
// Parse asset packet from OP_RETURN output
let assetPacket: InstanceType<typeof asset.Packet> | null = null;
if (type === 'arkade' && parsedTx) {
  for (let i = 0; i < parsedTx.outputsLength; i++) {
    const output = parsedTx.getOutput(i);
    if (output?.script) {
      try {
        if (asset.Packet.isAssetPacket(output.script)) {
          assetPacket = asset.Packet.fromScript(output.script);
          break;
        }
      } catch {
        // Not an asset packet or malformed — continue
      }
    }
  }
}
```

**Step 3: Add asset group display section**

In the arkade transaction rendering section (around line 854, after the outputs column closing `</div>` and before the timestamps), add an asset packet section:

```tsx
{/* Asset Packet */}
{assetPacket && (
  <div className="col-span-1 md:col-span-2 mt-4">
    <h3 className="text-lg font-bold text-arkade-purple uppercase mb-3">
      Asset Transfers ({assetPacket.groups.length})
    </h3>
    <div className="space-y-3">
      {assetPacket.groups.map((group, groupIdx) => {
        const groupAssetId = group.assetId?.toString() || 'unknown';
        return (
          <Card key={groupIdx}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-arkade-gray uppercase text-xs font-bold">Asset:</span>
                <AssetBadge assetId={groupAssetId} />
              </div>
              {group.inputs.length > 0 && (
                <div>
                  <span className="text-arkade-gray uppercase text-xs">Inputs:</span>
                  <div className="ml-2 space-y-1">
                    {group.inputs.map((input, i) => (
                      <div key={i} className="text-xs font-mono">
                        <span className="text-arkade-gray">Input #{input.inputIndex}:</span>{' '}
                        <AssetAmountDisplay
                          amount={Number(input.amount)}
                          assetId={groupAssetId}
                          valueClassName={`${moneyColor} font-bold`}
                          unitClassName={`${moneyColor}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {group.outputs.length > 0 && (
                <div>
                  <span className="text-arkade-gray uppercase text-xs">Outputs:</span>
                  <div className="ml-2 space-y-1">
                    {group.outputs.map((output, i) => (
                      <div key={i} className="text-xs font-mono">
                        <span className="text-arkade-gray">Output #{output.outputIndex}:</span>{' '}
                        <AssetAmountDisplay
                          amount={Number(output.amount)}
                          assetId={groupAssetId}
                          valueClassName={`${moneyColor} font-bold`}
                          unitClassName={`${moneyColor}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  </div>
)}
```

**Step 4: Add fallback asset display on outputs from VTXO data**

In the arkade output rendering (around line 797, after the `MoneyDisplay` for each output), add asset info from VTXO data when no packet was parsed:

```tsx
{/* Asset info from VTXO data (fallback when no packet) */}
{!assetPacket && vtxo?.assets && vtxo.assets.length > 0 && (
  <div className="flex flex-wrap items-center gap-1 mt-1">
    {vtxo.assets.map((a, ai) => (
      <AssetBadge key={ai} assetId={a.assetId} />
    ))}
  </div>
)}
```

> **Important:** The exact line numbers will shift after the packet parsing code is added. The key insertion points are:
> - Asset packet parsing: right after `parsedTx` is populated (after the existing PSBT parse block)
> - Asset group display: inside the arkade rendering section, after the inputs/outputs grid
> - Fallback on outputs: inside each output card, after the `MoneyDisplay`

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

> **Note:** The `Packet`, `AssetGroup`, `AssetInput`, `AssetOutput`, `AssetId` classes from the SDK may have slightly different property names than assumed here. Verify the actual SDK types:
> - `group.assetId` — check if this is `AssetId` class or string
> - `group.inputs` / `group.outputs` — check actual property names and shapes
> - `input.inputIndex` / `input.amount` — verify exact field names
> - `output.outputIndex` / `output.amount` — verify exact field names
>
> Run `npx tsc --noEmit` after each edit to catch type issues early. Adjust property access as needed.

**Step 6: Commit**

```bash
git add src/components/Transaction/TransactionDetails.tsx
git commit -m "feat: parse asset packets in transactions with VTXO fallback"
```

---

### Task 9: Build Verification & Manual Testing

**Step 1: Full build check**

Run: `npm run build`
Expected: Clean build with no errors

**Step 2: Manual testing checklist**

Start dev server: `npm run dev`

Test the following scenarios:

1. **Address page with asset VTXOs**: Navigate to an address that holds VTXOs with assets. Verify:
   - Each VTXO with assets shows `AssetBadge` + `AssetAmountDisplay` below the BTC amount
   - Asset badges link to `/asset/:assetId`
   - AddressStats shows asset balance section below BTC cards

2. **Asset page**: Click an asset badge to navigate to `/asset/:assetId`. Verify:
   - Asset details card shows: name, asset ID (copyable), ticker, decimals, supply, control asset link
   - Raw metadata debug toggle works
   - Loading and error states render correctly

3. **Transaction page with asset packet**: View a transaction that contains an OP_RETURN asset packet. Verify:
   - Asset Transfers section appears with parsed groups
   - Each group shows asset badge, input amounts, output amounts
   - If no packet, individual output VTXOs show asset badges as fallback

4. **Session cache**: Navigate away from an asset page and return. Verify the asset details load instantly from session storage (no network request in devtools).

5. **Edge cases**:
   - Asset with no metadata (should show truncated assetId)
   - Asset with 0 decimals (should show integer amounts)
   - Address with mixed BTC-only and asset VTXOs

**Step 3: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

### Task 10: Final Review & Cleanup

**Step 1: Review all changes**

Run: `git diff master...HEAD --stat`

Verify the file inventory matches the design doc:
- 5 new files created
- 6 existing files modified
- No unintended changes

**Step 2: Final build**

Run: `npm run build`
Expected: Clean build

**Step 3: Squash or tidy commits if needed**

The branch should have clean, logical commits ready for PR.
