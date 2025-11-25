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
        let scriptAddress = '';
        if ((vtxo as any)._psbt) {
          try {
            const psbtBase64 = (vtxo as any)._psbt;
            const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
            const tx = btc.Transaction.fromPSBT(psbtBytes);
            if (tx.outputsLength > outpointVout) {
              const output = tx.getOutput(outpointVout);
              if (output?.script) {
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-arkade-purple font-bold uppercase text-xs sm:text-sm flex-shrink-0">Outpoint:</span>
                  {outpointTxid && (
                    <>
                      <Link 
                        to={`/tx/${outpointTxid}`}
                        className="text-arkade-purple font-mono text-xs sm:text-sm hover:underline break-all"
                      >
                        <span className="sm:hidden">{truncateHash(outpointTxid, 6, 6)}</span>
                        <span className="hidden sm:inline">{truncateHash(outpointTxid, 12, 12)}</span>
                      </Link>
                      <span className="text-arkade-gray font-mono text-xs sm:text-sm">:{outpointVout}</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-1 flex-wrap">
                  {(vtxo as any).preconfirmed && <Badge variant="default">Preconfirmed</Badge>}
                  {vtxo.spentBy && <Badge variant="danger">Spent</Badge>}
                  {!vtxo.spentBy && isRecoverable && <Badge variant="warning">Recoverable</Badge>}
                  {!vtxo.spentBy && !isRecoverable && <Badge variant="success">Active</Badge>}
                </div>
              </div>

              <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 text-sm">
                <div className="flex items-center justify-between sm:block">
                  <span className="text-arkade-gray uppercase text-xs sm:text-sm">Amount:</span>
                  <span className="text-arkade-orange font-bold font-mono text-xs sm:text-sm sm:ml-2">{formatSats(vtxo.value.toString())} sats</span>
                </div>
                
                <div className="flex items-center justify-between sm:block">
                  <span className="text-arkade-gray uppercase text-xs sm:text-sm">Created:</span>
                  <span className="text-arkade-gray font-mono text-xs sm:text-sm sm:ml-2 break-all">{formatTimestamp(vtxo.createdAt.getTime())}</span>
                </div>

                {(vtxo as any).address && (
                  <div className="col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-arkade-gray uppercase text-xs sm:text-sm flex-shrink-0">Address:</span>
                      <Link 
                        to={`/address/${(vtxo as any).address}`}
                        className="text-arkade-purple font-mono text-xs sm:text-sm hover:underline inline-flex items-center gap-1 break-all"
                      >
                        <span className="break-all">
                          <span className="sm:hidden">{truncateHash((vtxo as any).address, 8, 8)}</span>
                          <span className="hidden sm:inline">{truncateHash((vtxo as any).address, 16, 16)}</span>
                        </span>
                        <ExternalLink size={12} className="flex-shrink-0" />
                      </Link>
                    </div>
                  </div>
                )}

                {showScript && scriptAddress && (
                  <div className="col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-arkade-gray uppercase text-xs flex-shrink-0">Address:</span>
                      <Link 
                        to={`/address/${scriptAddress}`}
                        className="text-arkade-purple font-mono text-xs hover:underline inline-flex items-center gap-1 break-all"
                      >
                        <span className="break-all">
                          <span className="sm:hidden">{truncateHash(scriptAddress, 8, 8)}</span>
                          <span className="hidden sm:inline">{truncateHash(scriptAddress, 16, 16)}</span>
                        </span>
                        <ExternalLink size={12} className="flex-shrink-0" />
                      </Link>
                    </div>
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
