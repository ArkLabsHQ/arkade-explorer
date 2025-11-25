import { Card } from '../UI/Card';
import { Vtxo } from '../../lib/api/indexer';
import { formatSats } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface AddressStatsProps {
  vtxos: Vtxo[];
}

export function AddressStats({ vtxos }: AddressStatsProps) {
  const { resolvedTheme } = useTheme();

  const activeVtxos = vtxos.filter((v) => !v.spentBy);
  const spentVtxos = vtxos.filter((v) => v.spentBy);

  const totalBalance = activeVtxos.reduce((sum, v) => sum + parseInt(v.value.toString()), 0);
  const totalReceived = vtxos.reduce((sum, v) => sum + parseInt(v.value.toString()), 0);

  // purple doesn't work in dark mode well for text, so we switch to orange
  const mypurple = resolvedTheme === 'dark' ? 'text-arkade-orange' : 'text-arkade-purple';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Total Balance</div>
          <div className="text-arkade-orange text-xl font-bold font-mono">{formatSats(totalBalance)}</div>
          <div className="text-arkade-gray text-xs">sats</div>
        </div>
      </Card>

      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Total Received</div>
          <div className={`${mypurple} text-xl font-bold font-mono`}>{formatSats(totalReceived)}</div>
          <div className="text-arkade-gray text-xs">sats</div>
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
