# Asset Icon Approval Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Only show asset icons for verified or user-approved assets; hide all others by default.

**Architecture:** Copy `AssetIconApprovalManager` from the wallet (class with verified + manually-approved ID sets). Wrap it in a React context provider that fetches verified assets from `VITE_VERIFIED_ASSETS_URL` on startup. Gate all icon rendering through `isApproved(assetId)`. Add a show/hide icon toggle on the asset detail page for non-verified assets.

**Tech Stack:** React 18, TypeScript, Vite env vars, localStorage, React Context

---

### Task 1: Create AssetIconApprovalManager

**Files:**
- Create: `src/lib/assetIconApproval.ts`

**Step 1: Create the manager class**

Copy from wallet (arkade-os/wallet commit 2b6e6f7). This is a standalone class with no React dependencies.

```typescript
export const APPROVED_ICONS_KEY = 'approvedAssetIcons'

export class AssetIconApprovalManager {
  private approvedIds: Set<string>
  private verifiedIds: Set<string>
  private storageKey: string

  constructor(storageKey = APPROVED_ICONS_KEY) {
    this.storageKey = storageKey
    this.approvedIds = this.load()
    this.verifiedIds = new Set()
  }

  approve(assetId: string): void {
    this.approvedIds.add(assetId)
    this.save()
  }

  revoke(assetId: string): void {
    this.approvedIds.delete(assetId)
    this.save()
  }

  isApproved(assetId: string): boolean {
    return this.approvedIds.has(assetId) || this.verifiedIds.has(assetId)
  }

  setVerifiedAssets(ids: string[]): void {
    this.verifiedIds = new Set(ids)
  }

  isVerified(assetId: string): boolean {
    return this.verifiedIds.has(assetId)
  }

  private load(): Set<string> {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return new Set()
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
      return new Set()
    } catch {
      return new Set()
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.approvedIds]))
    } catch {
      // localStorage quota exceeded — in-memory state remains correct
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `src/lib/assetIconApproval.ts`

---

### Task 2: Create AssetIconApprovalContext

**Files:**
- Create: `src/contexts/AssetIconApprovalContext.tsx`

**Step 1: Create the context provider**

Follow the same pattern as `src/contexts/ThemeContext.tsx` (createContext + Provider component + useX hook).

```typescript
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { AssetIconApprovalManager } from '../lib/assetIconApproval';

interface AssetIconApprovalContextType {
  isApproved: (assetId: string) => boolean;
  isVerified: (assetId: string) => boolean;
  approve: (assetId: string) => void;
  revoke: (assetId: string) => void;
}

const AssetIconApprovalContext = createContext<AssetIconApprovalContextType | undefined>(undefined);

export function AssetIconApprovalProvider({ children }: { children: ReactNode }) {
  const manager = useRef(new AssetIconApprovalManager()).current;
  const [, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    const verifiedUrl = import.meta.env.VITE_VERIFIED_ASSETS_URL;
    if (!verifiedUrl) return;

    fetch(verifiedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || !data.every((id) => typeof id === 'string')) {
          throw new Error('Invalid verified assets response');
        }
        manager.setVerifiedAssets(data);
        refresh();
      })
      .catch((err) => console.error('Failed to fetch verified assets:', err));
  }, []);

  const approve = useCallback((assetId: string) => {
    manager.approve(assetId);
    refresh();
  }, []);

  const revoke = useCallback((assetId: string) => {
    manager.revoke(assetId);
    refresh();
  }, []);

  const isApproved = useCallback((assetId: string) => manager.isApproved(assetId), []);
  const isVerified = useCallback((assetId: string) => manager.isVerified(assetId), []);

  return (
    <AssetIconApprovalContext.Provider value={{ isApproved, isVerified, approve, revoke }}>
      {children}
    </AssetIconApprovalContext.Provider>
  );
}

export function useAssetIconApproval() {
  const context = useContext(AssetIconApprovalContext);
  if (!context) {
    throw new Error('useAssetIconApproval must be used within AssetIconApprovalProvider');
  }
  return context;
}
```

Key details:
- `manager` is instantiated once via `useRef(...).current` — singleton for the app lifetime
- `revision` state counter forces re-renders when `approve`/`revoke` are called or when verified assets are fetched
- The `isApproved`/`isVerified` callbacks always read from the live manager (no stale closures since the manager is a ref)
- Fetch runs once on mount, silently fails if URL is missing or invalid

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 3: Wire provider into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add the provider**

Import `AssetIconApprovalProvider` and wrap it around the existing provider stack. Place it inside `QueryClientProvider` (no dependency on query client, but keeps nesting consistent).

In `src/App.tsx`, add the import:
```typescript
import { AssetIconApprovalProvider } from './contexts/AssetIconApprovalContext';
```

Wrap the provider tree — add `<AssetIconApprovalProvider>` around `<ThemeProvider>`:
```typescript
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AssetIconApprovalProvider>
        <ThemeProvider>
          <MoneyDisplayProvider>
            <ServerInfoProvider>
              <ActivityStreamProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />
                      <Route path="tx/:txid" element={<TransactionPage />} />
                      <Route path="address/:address" element={<AddressPage />} />
                      <Route path="commitment-tx/:txid" element={<CommitmentTxPage />} />
                      <Route path="asset/:assetId" element={<AssetPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </ActivityStreamProvider>
            </ServerInfoProvider>
          </MoneyDisplayProvider>
        </ThemeProvider>
      </AssetIconApprovalProvider>
    </QueryClientProvider>
  );
}
```

**Step 2: Verify TypeScript compiles and dev server starts**

Run: `npx tsc --noEmit && npx vite --open`
Expected: App loads without errors, no console errors (or just a fetch warning if no env var set)

---

### Task 4: Gate icons in AssetBadge

**Files:**
- Modify: `src/components/UI/AssetBadge.tsx`

**Step 1: Add approval check**

Import the hook and gate the icon rendering:

```typescript
import { useAssetIconApproval } from '../../contexts/AssetIconApprovalContext';
```

Inside the component, add:
```typescript
const { isApproved } = useAssetIconApproval();
```

Change the icon condition from:
```tsx
{metadata?.icon && isSafeImageUrl(metadata.icon) && (
```
to:
```tsx
{metadata?.icon && isSafeImageUrl(metadata.icon) && isApproved(assetId) && (
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 5: Gate icons in AssetAmountDisplay

**Files:**
- Modify: `src/components/UI/AssetAmountDisplay.tsx`

**Step 1: Add approval check**

Same pattern as AssetBadge:

```typescript
import { useAssetIconApproval } from '../../contexts/AssetIconApprovalContext';
```

Inside the component:
```typescript
const { isApproved } = useAssetIconApproval();
```

Change the icon condition from:
```tsx
{!hideUnit && metadata?.icon && isSafeImageUrl(metadata.icon) && (
```
to:
```tsx
{!hideUnit && metadata?.icon && isSafeImageUrl(metadata.icon) && isApproved(assetId) && (
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 6: Gate icon + add toggle in AssetDetails

**Files:**
- Modify: `src/components/Asset/AssetDetails.tsx`

This is the most complex change. The asset detail page needs to:
1. Gate the header icon on `isApproved`
2. Show a "Show icon" / "Hide icon" button for non-verified assets that have an icon

**Step 1: Add approval hook and gate the icon**

```typescript
import { useAssetIconApproval } from '../../contexts/AssetIconApprovalContext';
```

The component currently receives `assetDetails` as props. Add the hook inside:
```typescript
const { isApproved, isVerified, approve, revoke } = useAssetIconApproval();
```

Derive helper values:
```typescript
const hasIcon = !!metadata?.icon && isSafeImageUrl(metadata.icon);
const showIcon = hasIcon && isApproved(assetDetails.assetId);
```

Change the header icon rendering from:
```tsx
{metadata?.icon && isSafeImageUrl(metadata.icon) && (
  <ImageLightbox src={metadata.icon} className="w-10 h-10 rounded-full" />
)}
```
to:
```tsx
{showIcon && (
  <ImageLightbox src={metadata!.icon! } className="w-10 h-10 rounded-full" />
)}
```

**Step 2: Add the toggle button**

After the Control Asset section (before the Debug section), add an icon approval toggle. Only show it when the asset has an icon but is NOT in the verified list (verified assets always show their icon, no toggle needed):

```tsx
{hasIcon && !isVerified(assetDetails.assetId) && (
  <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
    <span className="text-arkade-gray uppercase text-sm font-bold">Asset Icon</span>
    <button
      onClick={() => {
        if (isApproved(assetDetails.assetId)) {
          revoke(assetDetails.assetId);
        } else {
          approve(assetDetails.assetId);
        }
      }}
      className="px-3 py-1 text-xs font-bold uppercase border transition-colors
        border-arkade-purple text-arkade-purple hover:bg-arkade-purple hover:text-white"
    >
      {isApproved(assetDetails.assetId) ? 'Hide icon' : 'Show icon'}
    </button>
  </div>
)}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 7: Document env var in README and .env.example

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Step 1: Update .env.example**

Add after the existing `VITE_INDEXER_URL` line:
```
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

**Step 2: Update README.md**

In the Configuration section, update the `.env` code block to include the new variable:

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

Add an Environment Variables section after Configuration (or expand the existing one) with a table:

```markdown
### Environment Variables

| Variable | Description | Required | Example |
|---|---|---|---|
| `VITE_INDEXER_URL` | Arkade indexer API URL | Yes | `https://indexer.arkadeos.com` |
| `VITE_VERIFIED_ASSETS_URL` | URL to fetch verified asset IDs (JSON array of strings). When set, only verified or user-approved assets show icons. | No | `https://arklabshq.github.io/asset-registry/mutinynet.json` |
```

**Step 3: Verify final build**

Run: `npx tsc --noEmit && npx vite build`
Expected: Clean build with no errors

---

## Summary of all files touched

| Action | File |
|---|---|
| Create | `src/lib/assetIconApproval.ts` |
| Create | `src/contexts/AssetIconApprovalContext.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/components/UI/AssetBadge.tsx` |
| Modify | `src/components/UI/AssetAmountDisplay.tsx` |
| Modify | `src/components/Asset/AssetDetails.tsx` |
| Modify | `README.md` |
| Modify | `.env.example` |
