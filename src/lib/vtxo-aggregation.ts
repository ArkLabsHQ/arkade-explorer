import type { VirtualCoin, PageResponse } from "@arkade-os/sdk";

/** A VTXO is "active" (unspent) when it has no spentBy and is not flagged spent. */
export function isVtxoActive(vtxo: VirtualCoin): boolean {
    return !(vtxo.spentBy && vtxo.spentBy !== "") && !vtxo.isSpent;
}

/** Sum of sat value across all given VTXOs (total received). */
export function sumVtxoValue(vtxos: VirtualCoin[]): number {
    return vtxos.reduce((sum, v) => sum + Number(v.value), 0);
}

/** Sum of sat value across active (unspent) VTXOs (spendable balance). */
export function sumActiveVtxoValue(vtxos: VirtualCoin[]): number {
    return vtxos.reduce((sum, v) => (isVtxoActive(v) ? sum + Number(v.value) : sum), 0);
}

export interface AssetBalance {
    active: number;
    total: number;
}

/** Aggregate per-asset active/total amounts across all given VTXOs. */
export function aggregateAssetBalances(vtxos: VirtualCoin[]): Map<string, AssetBalance> {
    const balances = new Map<string, AssetBalance>();
    for (const v of vtxos) {
        const active = isVtxoActive(v);
        for (const asset of v.assets ?? []) {
            const existing = balances.get(asset.assetId) ?? { active: 0, total: 0 };
            existing.total += Number(asset.amount);
            if (active) existing.active += Number(asset.amount);
            balances.set(asset.assetId, existing);
        }
    }
    return balances;
}

/**
 * Whether the infinite query has more pages to drain, given the last page's
 * PageResponse. Mirrors the termination logic of the address query's
 * getNextPageParam so both can share one tested predicate.
 */
export function hasMorePages(page: PageResponse | undefined): boolean {
    if (!page) return false;
    const { next, current, total } = page;
    if (next <= current) return false;
    if (total > 0 && current >= total - 1) return false;
    return true;
}
