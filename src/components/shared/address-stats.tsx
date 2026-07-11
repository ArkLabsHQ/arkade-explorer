import { useRef } from "react";
import type { VirtualCoin } from "@arkade-os/sdk";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoneyDisplay } from "@/components/shared/money-display";
import { AssetBadge } from "@/components/shared/asset-badge";
import { AssetAmountDisplay } from "@/components/shared/asset-amount-display";
import {
    isVtxoActive,
    sumActiveVtxoValue,
    sumVtxoValue,
    aggregateAssetBalances,
} from "@/lib/vtxo-aggregation";

interface AddressStatsProps {
    vtxos: VirtualCoin[];
    className?: string;
    isDraining?: boolean;
}

export function AddressStats({ vtxos, className, isDraining }: AddressStatsProps) {
    const activeVtxos = vtxos.filter(isVtxoActive);
    const spentCount = vtxos.length - activeVtxos.length;

    const totalBalance = sumActiveVtxoValue(vtxos);
    const totalReceived = sumVtxoValue(vtxos);

    const assetBalances = aggregateAssetBalances(vtxos);
    const assetEntries = Array.from(assetBalances.entries());
    const hasAssets = assetEntries.length > 0;

    // -----------------------------------------------------------------------
    // Layout: scrollable asset balance list (when assets exist)
    // -----------------------------------------------------------------------
    if (hasAssets) {
        return (
            <div className={className ?? "max-w-lg"}>
                <div className="rounded-xl border border-border bg-card p-5 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                            Balances
                        </h3>
                        {isDraining && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                updating…
                            </span>
                        )}
                    </div>

                    {/* Column header */}
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <span />
                        <span className="text-right">Balance</span>
                        <span className="text-right pl-3">Received</span>
                    </div>

                    {/* Pinned BTC row */}
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center border-b border-border py-1.5">
                        <span className="text-foreground font-bold uppercase">BTC</span>
                        <MoneyDisplay
                            sats={totalBalance}
                            className="text-foreground font-bold font-mono text-right"
                        />
                        <MoneyDisplay
                            sats={totalReceived}
                            className="text-muted-foreground font-mono text-right pl-3"
                        />
                    </div>

                    {/* Virtualized asset rows */}
                    <AssetRowsVirtualized assetEntries={assetEntries} />

                    {/* VTXO summary footer */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
                        <span className="text-muted-foreground uppercase">
                            VTXOs:{" "}
                            <span className="text-foreground font-bold font-mono">
                                {activeVtxos.length}
                            </span>{" "}
                            active
                        </span>
                        <span className="text-muted-foreground uppercase">
                            <span className="text-muted-foreground font-bold font-mono">
                                {spentCount}
                            </span>{" "}
                            spent
                        </span>
                        <span className="text-muted-foreground uppercase">
                            of {vtxos.length} total
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Layout: simple 4-card grid (no assets)
    // -----------------------------------------------------------------------
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
                <div className="text-center space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total balance
                    </div>
                    <MoneyDisplay
                        sats={totalBalance}
                        className="text-foreground text-xl font-bold font-mono block"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
                <div className="text-center space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total received
                    </div>
                    <MoneyDisplay
                        sats={totalReceived}
                        className="text-foreground text-xl font-bold font-mono block"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
                <div className="text-center space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Active VTXOs
                    </div>
                    <div className="text-foreground text-xl font-bold font-mono">
                        {activeVtxos.length}
                    </div>
                    <div className="text-xs text-muted-foreground">of {vtxos.length}</div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
                <div className="text-center space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Spent VTXOs
                    </div>
                    <div className="text-muted-foreground text-xl font-bold font-mono">
                        {spentCount}
                    </div>
                    <div className="text-xs text-muted-foreground">of {vtxos.length}</div>
                </div>
            </div>
        </div>
    );
}

function AssetRowsVirtualized({
    assetEntries,
}: {
    assetEntries: [string, { active: number; total: number }][];
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: assetEntries.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 34,
        overscan: 10,
        getItemKey: (index) => assetEntries[index][0],
    });

    return (
        <div
            ref={scrollRef}
            className="overflow-y-auto overflow-x-hidden min-h-0 flex-1 max-h-[60vh]"
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: "relative",
                    width: "100%",
                }}
            >
                {virtualizer.getVirtualItems().map((item) => {
                    const [assetId, balances] = assetEntries[item.index];
                    return (
                        <div
                            key={item.key}
                            data-index={item.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${item.start}px)`,
                            }}
                            className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center border-b border-border py-1.5"
                        >
                            <AssetBadge assetId={assetId} />
                            <AssetAmountDisplay
                                amount={balances.active}
                                assetId={assetId}
                                hideUnit
                                valueClassName="text-foreground font-bold font-mono text-right"
                            />
                            <AssetAmountDisplay
                                amount={balances.total}
                                assetId={assetId}
                                hideUnit
                                valueClassName="text-muted-foreground font-mono text-right pl-3"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
