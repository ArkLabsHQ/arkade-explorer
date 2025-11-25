import { Card } from '../UI/Card';
import { Vtxo } from '../../lib/api/indexer';
import { formatSats } from '../../lib/utils';

interface AddressStatsProps {
  vtxos: Vtxo[];
}

export function AddressStats({ vtxos }: AddressStatsProps) {
  const activeVtxos = vtxos.filter(v => !v.spentBy);
  const spentVtxos = vtxos.filter(v => v.spentBy);
  
  const totalBalance = activeVtxos.reduce((sum, v) => sum + parseInt(v.value.toString()), 0);
  const totalReceived = vtxos.reduce((sum, v) => sum + parseInt(v.value.toString()), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Total Balance</div>
          <div className="text-arkade-orange text-2xl font-bold font-mono">{formatSats(totalBalance)}</div>
          <div className="text-arkade-gray text-xs">sats</div>
        </div>
      </Card>
      
      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Total Received</div>
          <div className="text-arkade-purple text-2xl font-bold font-mono">{formatSats(totalReceived)}</div>
          <div className="text-arkade-gray text-xs">sats</div>
        </div>
      </Card>
      
      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Active VTXOs</div>
          <div className="text-green-500 text-2xl font-bold font-mono">{activeVtxos.length}</div>
          <div className="text-arkade-gray text-xs">of {vtxos.length}</div>
        </div>
      </Card>
      
      <Card>
        <div className="text-center space-y-2">
          <div className="text-arkade-gray uppercase text-xs font-bold">Spent VTXOs</div>
          <div className="text-arkade-gray text-2xl font-bold font-mono">{spentVtxos.length}</div>
          <div className="text-arkade-gray text-xs">of {vtxos.length}</div>
        </div>
      </Card>
    </div>
  );
}
