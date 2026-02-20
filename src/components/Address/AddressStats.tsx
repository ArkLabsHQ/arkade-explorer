import { Card } from '../UI/Card';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { Vtxo } from '../../lib/api/indexer';
import { useTheme } from '../../contexts/ThemeContext';
import { AssetBadge } from '../UI/AssetBadge';
import { AssetAmountDisplay } from '../UI/AssetAmountDisplay';

interface AddressStatsProps {
  vtxos: Vtxo[];
}

export function AddressStats({ vtxos }: AddressStatsProps) {
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

  return (
    <>
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

      {hasAssets && (
        <div className="mt-4 space-y-2">
          <h3 className={`text-sm font-bold ${mypurple} uppercase`}>Asset Balances</h3>
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
    </>
  );
}
