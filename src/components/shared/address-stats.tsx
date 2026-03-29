import type { VirtualCoin } from '@arkade-os/sdk';
import { MoneyDisplay } from '@/components/shared/money-display';
import { AssetBadge } from '@/components/shared/asset-badge';
import { AssetAmountDisplay } from '@/components/shared/asset-amount-display';

interface AddressStatsProps {
  vtxos: VirtualCoin[];
  className?: string;
}

export function AddressStats({ vtxos, className }: AddressStatsProps) {
  const isVtxoActive = (v: VirtualCoin) =>
    !(v.spentBy && v.spentBy !== '') && !v.isSpent;

  const activeVtxos = vtxos.filter(isVtxoActive);
  const spentVtxos = vtxos.filter((v) => !isVtxoActive(v));

  const totalBalance = activeVtxos.reduce(
    (sum, v) => sum + Number(v.value),
    0,
  );
  const totalReceived = vtxos.reduce(
    (sum, v) => sum + Number(v.value),
    0,
  );

  // Aggregate asset balances per asset ID
  const assetBalances = new Map<string, { active: number; total: number }>();
  vtxos.forEach((v) => {
    const isActive = isVtxoActive(v);
    v.assets?.forEach((asset) => {
      const existing = assetBalances.get(asset.assetId) || {
        active: 0,
        total: 0,
      };
      existing.total += asset.amount;
      if (isActive) existing.active += asset.amount;
      assetBalances.set(asset.assetId, existing);
    });
  });

  const hasAssets = assetBalances.size > 0;

  // -----------------------------------------------------------------------
  // Layout: scrollable asset balance table (when assets exist)
  // -----------------------------------------------------------------------
  if (hasAssets) {
    return (
      <div className={className ?? 'max-w-lg'}>
        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] flex flex-col overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-3">
            Balances
          </h3>

          <div className="overflow-y-auto overflow-x-hidden min-h-0 flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left" />
                  <th className="text-right pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Balance
                  </th>
                  <th className="text-right pb-2 pl-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Received
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* BTC row */}
                <tr className="border-b border-border">
                  <td className="py-1.5">
                    <span className="text-foreground font-bold uppercase">BTC</span>
                  </td>
                  <td className="text-right py-1.5">
                    <MoneyDisplay
                      sats={totalBalance}
                      className="text-foreground font-bold font-mono"
                    />
                  </td>
                  <td className="text-right py-1.5 pl-3">
                    <MoneyDisplay
                      sats={totalReceived}
                      className="text-muted-foreground font-mono"
                    />
                  </td>
                </tr>

                {/* Asset rows */}
                {Array.from(assetBalances.entries()).map(
                  ([assetId, balances], idx) => (
                    <tr
                      key={assetId}
                      className={
                        idx < assetBalances.size - 1
                          ? 'border-b border-border'
                          : ''
                      }
                    >
                      <td className="py-1.5">
                        <AssetBadge assetId={assetId} />
                      </td>
                      <td className="text-right py-1.5">
                        <AssetAmountDisplay
                          amount={balances.active}
                          assetId={assetId}
                          hideUnit
                          valueClassName="text-foreground font-bold font-mono"
                        />
                      </td>
                      <td className="text-right py-1.5 pl-3">
                        <AssetAmountDisplay
                          amount={balances.total}
                          assetId={assetId}
                          hideUnit
                          valueClassName="text-muted-foreground font-mono"
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* VTXO summary footer */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
            <span className="text-muted-foreground uppercase">
              VTXOs:{' '}
              <span className="text-foreground font-bold font-mono">
                {activeVtxos.length}
              </span>{' '}
              active
            </span>
            <span className="text-muted-foreground uppercase">
              <span className="text-muted-foreground font-bold font-mono">
                {spentVtxos.length}
              </span>{' '}
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
          <div className="text-xs text-muted-foreground">
            of {vtxos.length}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
        <div className="text-center space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Spent VTXOs
          </div>
          <div className="text-muted-foreground text-xl font-bold font-mono">
            {spentVtxos.length}
          </div>
          <div className="text-xs text-muted-foreground">
            of {vtxos.length}
          </div>
        </div>
      </div>
    </div>
  );
}
