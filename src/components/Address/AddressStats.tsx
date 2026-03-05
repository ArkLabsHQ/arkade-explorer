import { Card } from '../UI/Card';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { Vtxo } from '../../lib/api/indexer';
import { useTheme } from '../../contexts/ThemeContext';
import { AssetBadge } from '../UI/AssetBadge';
import { AssetAmountDisplay } from '../UI/AssetAmountDisplay';

interface AddressStatsProps {
  vtxos: Vtxo[];
  className?: string;
}

export function AddressStats({ vtxos, className }: AddressStatsProps) {
  const { resolvedTheme } = useTheme();

  const isVtxoActive = (v: Vtxo) => !(v.spentBy && v.spentBy !== '') && !v.isSpent;
  const activeVtxos = vtxos.filter(isVtxoActive);
  const spentVtxos = vtxos.filter((v) => !isVtxoActive(v));

  const totalBalance = activeVtxos.reduce((sum, v) => sum + parseInt(v.value.toString()), 0);
  const totalReceived = vtxos.reduce((sum, v) => sum + parseInt(v.value.toString()), 0);

  // Aggregate asset balances
  const assetBalances = new Map<string, { active: number; total: number }>();
  vtxos.forEach((v) => {
    const isActive = isVtxoActive(v);
    v.assets?.forEach((asset) => {
      const existing = assetBalances.get(asset.assetId) || { active: 0, total: 0 };
      existing.total += asset.amount;
      if (isActive) existing.active += asset.amount;
      assetBalances.set(asset.assetId, existing);
    });
  });
  const hasAssets = assetBalances.size > 0;

  // purple doesn't work in dark mode well for text, so we switch to orange
  const mypurple = resolvedTheme === 'dark' ? 'text-arkade-orange' : 'text-arkade-purple';

  if (hasAssets) {
    return (
      <div className={className || 'max-w-lg'}>
        <Card>
          <h3 className={`text-sm font-bold ${mypurple} uppercase mb-3`}>Balances</h3>
          <div className="flex items-center justify-end gap-4 mb-2">
            <span className="text-arkade-gray uppercase text-xs w-24 text-right">Balance</span>
            <span className="text-arkade-gray uppercase text-xs w-24 text-right">Received</span>
          </div>
          <div className="space-y-2">
            {/* BTC row */}
            <div className="flex items-center justify-between border-b border-arkade-purple/30 pb-2">
              <span className={`${mypurple} font-bold text-sm uppercase`}>BTC</span>
              <div className="flex items-center gap-4">
                <div className="w-24 text-right">
                  <MoneyDisplay
                    sats={totalBalance}
                    valueClassName={`${mypurple} font-bold font-mono text-sm`}
                    unitClassName="text-arkade-gray text-xs"
                  />
                </div>
                <div className="w-24 text-right">
                  <MoneyDisplay
                    sats={totalReceived}
                    valueClassName="text-arkade-gray font-mono text-sm"
                    unitClassName="text-arkade-gray text-xs"
                  />
                </div>
              </div>
            </div>
            {/* Asset rows */}
            {Array.from(assetBalances.entries()).map(([assetId, balances]) => (
              <div key={assetId} className="flex items-center justify-between border-b border-arkade-purple/30 pb-2 last:border-0 last:pb-0">
                <AssetBadge assetId={assetId} />
                <div className="flex items-center gap-4">
                  <div className="w-24 text-right">
                    <AssetAmountDisplay
                      amount={balances.active}
                      assetId={assetId}
                      hideUnit
                      valueClassName={`${mypurple} font-bold font-mono text-sm`}
                    />
                  </div>
                  <div className="w-24 text-right">
                    <AssetAmountDisplay
                      amount={balances.total}
                      assetId={assetId}
                      hideUnit
                      valueClassName="text-arkade-gray font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* VTXO summary */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-arkade-purple/30 text-xs">
            <span className="text-arkade-gray uppercase">
              VTXOs: <span className="text-green-500 font-bold font-mono">{activeVtxos.length}</span> active
            </span>
            <span className="text-arkade-gray uppercase">
              <span className="text-arkade-gray font-bold font-mono">{spentVtxos.length}</span> spent
            </span>
            <span className="text-arkade-gray uppercase">of {vtxos.length} total</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Total Balance</div>
          <MoneyDisplay
            sats={totalBalance}
            layout="block"
            valueClassName={`${mypurple} text-xl font-bold font-mono`}
            unitClassName="text-arkade-gray text-xs"
          />
        </div>
      </Card>

      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Total Received</div>
          <MoneyDisplay
            sats={totalReceived}
            layout="block"
            valueClassName={`${mypurple} text-xl font-bold font-mono`}
            unitClassName="text-arkade-gray text-xs"
          />
        </div>
      </Card>

      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Active VTXOs</div>
          <div className="text-green-500 text-xl font-bold font-mono">{activeVtxos.length}</div>
          <div className="text-arkade-gray text-xs">of {vtxos.length}</div>
        </div>
      </Card>

      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Spent VTXOs</div>
          <div className="text-arkade-gray text-xl font-bold font-mono">{spentVtxos.length}</div>
          <div className="text-arkade-gray text-xs">of {vtxos.length}</div>
        </div>
      </Card>
    </div>
  );
}
