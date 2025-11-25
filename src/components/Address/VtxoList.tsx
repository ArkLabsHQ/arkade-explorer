import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { formatTimestamp, formatSats, truncateHash } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { Vtxo } from '../../lib/api/indexer';
import { ExternalLink } from 'lucide-react';
import * as btc from '@scure/btc-signer';
import { constructArkAddress } from '../../lib/arkAddress';
import { useServerInfo } from '../../contexts/ServerInfoContext';

interface VtxoListProps {
  vtxos: Vtxo[];
  showScript?: boolean;
}

export function VtxoList({ vtxos, showScript = false }: VtxoListProps) {
  const { serverInfo } = useServerInfo();

  if (vtxos.length === 0) {
    return (
      <Card>
        <p className="text-arkade-gray text-center py-8 uppercase">No VTXOs found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {vtxos.map((vtxo, idx) => {
        const outpointTxid = vtxo.txid || '';
        const outpointVout = vtxo.vout !== undefined ? vtxo.vout : idx;
        // A VTXO is recoverable if it's expired but not spent (unspent but unspendable)
        const expireAt = (vtxo as any).expireAt || (vtxo as any).expiresAt;
        const isExpired = expireAt ? new Date(expireAt) < new Date() : false;
        const isRecoverable = !vtxo.spentBy && isExpired;

        // Extract script from PSBT if available
        let scriptPubkey = '';
        let scriptAddress = '';
        if ((vtxo as any)._psbt) {
          try {
            const psbtBase64 = (vtxo as any)._psbt;
            const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
            const tx = btc.Transaction.fromPSBT(psbtBytes);
            if (tx.outputsLength > outpointVout) {
              const output = tx.getOutput(outpointVout);
              if (output?.script) {
                // Convert Uint8Array to hex string
                scriptPubkey = Array.from(output.script)
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join('');
                
                // Try to construct Ark address
                try {
                  if (serverInfo?.signerPubkey && serverInfo?.network) {
                    const arkAddr = constructArkAddress(output.script, serverInfo.signerPubkey, serverInfo.network);
                    if (arkAddr) {
                      scriptAddress = arkAddr;
                    }
                  }
                } catch (e) {
                  console.error('Failed to construct Ark address:', e);
                }
              }
            }
          } catch (e) {
            console.error('Failed to decode PSBT:', e);
          }
        }
        
        return (
          <Card 
            key={idx} 
            glowing={!vtxo.spentBy && !isRecoverable}
            className="animate-slide-in"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-arkade-purple font-bold uppercase text-sm">Outpoint:</span>
                  {outpointTxid && (
                    <>
                      <Link 
                        to={`/tx/${outpointTxid}`}
                        className="text-arkade-purple font-mono text-sm hover:underline"
                      >
                        {truncateHash(outpointTxid, 8, 8)}
                      </Link>
                      <span className="text-arkade-gray font-mono text-sm">:{outpointVout}</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {(vtxo as any).preconfirmed && <Badge variant="default">Preconfirmed</Badge>}
                  {vtxo.spentBy && <Badge variant="danger">Spent</Badge>}
                  {!vtxo.spentBy && isRecoverable && <Badge variant="warning">Recoverable</Badge>}
                  {!vtxo.spentBy && !isRecoverable && <Badge variant="success">Active</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-arkade-gray uppercase">Amount:</span>
                  <span className="text-arkade-orange ml-2 font-bold font-mono">{formatSats(vtxo.value.toString())} sats</span>
                </div>
                
                <div>
                  <span className="text-arkade-gray uppercase">Created:</span>
                  <span className="text-arkade-gray ml-2 font-mono">{formatTimestamp(vtxo.createdAt.getTime())}</span>
                </div>

                {(vtxo as any).address && (
                  <div className="col-span-2">
                    <span className="text-arkade-gray uppercase">Address:</span>
                    <Link 
                      to={`/address/${(vtxo as any).address}`}
                      className="text-arkade-purple ml-2 font-mono hover:underline inline-flex items-center space-x-1"
                    >
                      <span>{truncateHash((vtxo as any).address, 12, 12)}</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                )}

                {showScript && scriptAddress && (
                  <div className="col-span-2">
                    <span className="text-arkade-gray uppercase text-xs">Address:</span>
                    <Link 
                      to={`/address/${scriptAddress}`}
                      className="text-arkade-purple ml-2 font-mono text-xs hover:underline inline-flex items-center space-x-1"
                    >
                      <span>{truncateHash(scriptAddress, 16, 16)}</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                )}

                {expireAt && (
                  <div>
                    <span className="text-arkade-gray uppercase">Expires:</span>
                    <span className={`ml-2 font-mono ${isExpired ? 'text-arkade-orange' : 'text-arkade-gray'}`}>
                      {formatTimestamp(new Date(expireAt).getTime())}
                    </span>
                  </div>
                )}

                {vtxo.spentBy && (
                  <div className="col-span-2">
                    <span className="text-arkade-gray uppercase">Spent By:</span>
                    <Link 
                      to={`/tx/${vtxo.spentBy}`}
                      className="text-arkade-purple ml-2 font-mono hover:underline"
                    >
                      {truncateHash(vtxo.spentBy, 8, 8)}
                    </Link>
                  </div>
                )}

                {(vtxo as any).settledBy && (
                  <div className="col-span-2">
                    <span className="text-arkade-gray uppercase">Settled By:</span>
                    <Link 
                      to={`/commitment-tx/${(vtxo as any).settledBy}`}
                      className="text-arkade-purple ml-2 font-mono hover:underline"
                    >
                      {truncateHash((vtxo as any).settledBy, 8, 8)}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
