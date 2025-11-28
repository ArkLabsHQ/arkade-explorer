import { useState } from 'react';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { formatTimestamp, truncateHash } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { Vtxo } from '../../lib/api/indexer';
import { ExternalLink } from 'lucide-react';
import * as btc from '@scure/btc-signer';
import { constructArkAddress } from '../../lib/arkAddress';
import { useServerInfo } from '../../contexts/ServerInfoContext';
import { useTheme } from '../../contexts/ThemeContext';

interface VtxoListProps {
  vtxos: Vtxo[];
  showScript?: boolean;
}

export function VtxoList({ vtxos, showScript = false }: VtxoListProps) {
  const { serverInfo } = useServerInfo();
  const { resolvedTheme } = useTheme();
  const [showDebug, setShowDebug] = useState(false);

  if (vtxos.length === 0) {
    return (
      <Card>
        <p className="text-arkade-gray text-center py-8 uppercase">No VTXOs found</p>
      </Card>
    );
  }

  // purple doesn't work in dark mode well for text, so we switch to orange
  const mypurple = resolvedTheme === 'dark' ? 'text-arkade-gray' : 'text-arkade-purple';

  return (
    <div className="space-y-4">
      {vtxos.map((vtxo, idx) => {
        const outpointTxid = vtxo.txid || '';
        const outpointVout = vtxo.vout !== undefined ? vtxo.vout : idx;
        // A VTXO is recoverable if it's swept (expired and unspent)
        const expireAt = (vtxo as any).expireAt || (vtxo as any).expiresAt;
        const isExpired = expireAt ? new Date(expireAt) < new Date() : false;
        const isSpent = vtxo.spentBy || (vtxo as any).isSpent;
        const isRecoverable = !isSpent && (vtxo as any).virtualStatus?.state === 'swept';
        const isSettled = (vtxo as any).virtualStatus?.state === 'settled';

        // Extract script from PSBT if available
        let scriptAddress = '';
        if ((vtxo as any)._psbt) {
          try {
            const psbtBase64 = (vtxo as any)._psbt;
            const psbtBytes = Uint8Array.from(atob(psbtBase64), (c) => c.charCodeAt(0));
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
            glowing={!isSpent && !isRecoverable}
            className="animate-slide-in"
            style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${mypurple} font-bold uppercase text-xs sm:text-sm shrink-0`}>Outpoint:</span>
                  {outpointTxid && (
                    <>
                      <Link
                        to={`/tx/${outpointTxid}`}
                        className="font-mono text-xs sm:text-sm hover:underline break-all">
                        <span className={`${mypurple} sm:hidden`}>{truncateHash(outpointTxid, 6, 6)}</span>
                        <span className={`${mypurple} hidden sm:inline`}>{truncateHash(outpointTxid, 12, 12)}</span>
                      </Link>
                      <span className="text-arkade-gray font-mono text-xs sm:text-sm">:{outpointVout}</span>
                    </>
                  )}
                </div>

                <div className="flex items-end gap-1 flex-wrap">
                  {isSettled && <Badge variant="default">Settled</Badge>}
                  {isSpent && <Badge variant="danger">Spent</Badge>}
                  {!isSpent && isRecoverable && <Badge variant="warning">Recoverable</Badge>}
                  {!isSpent && !isRecoverable && <Badge variant="success">Unspent</Badge>}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-arkade-gray uppercase text-xs sm:text-sm">Amount:</span>
                  <MoneyDisplay 
                    sats={parseInt(vtxo.value.toString())} 
                    valueClassName="text-arkade-orange font-bold font-mono text-xs sm:text-sm sm:ml-2"
                    unitClassName="text-arkade-orange font-bold font-mono text-xs sm:text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <span className="text-arkade-gray uppercase text-xs sm:text-sm">Created:</span>
                  <span className="text-arkade-gray font-mono text-xs sm:text-sm sm:ml-2 break-all">
                    {formatTimestamp(vtxo.createdAt.getTime())}
                  </span>
                </div>

                {expireAt && (
                  <div className="flex gap-2">
                    <span className="text-arkade-gray uppercase text-xs sm:text-sm">Expires:</span>
                    <span className={`font-mono text-xs sm:text-sm sm:ml-2 ${isExpired ? 'text-arkade-orange' : 'text-arkade-gray'}`}>
                      {formatTimestamp(new Date(expireAt).getTime())}
                    </span>
                  </div>
                )}

                {(vtxo as any).address && (
                  <div className="col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-arkade-gray uppercase text-xs sm:text-sm shrink-0">Address:</span>
                      <Link
                        to={`/address/${(vtxo as any).address}`}
                        className="font-mono text-xs sm:text-sm hover:underline inline-flex items-center gap-1 break-all">
                        <span className={`${mypurple} break-all`}>
                          <span className="sm:hidden">{truncateHash((vtxo as any).address, 8, 8)}</span>
                          <span className="hidden sm:inline">{truncateHash((vtxo as any).address, 16, 16)}</span>
                        </span>
                        <ExternalLink size={12} className="shrink-0" />
                      </Link>
                    </div>
                  </div>
                )}

                {showScript && scriptAddress && (
                  <div className="col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-arkade-gray uppercase text-xs shrink-0">Address:</span>
                      <Link
                        to={`/address/${scriptAddress}`}
                        className={`${mypurple} font-mono text-xs hover:underline inline-flex items-center gap-1 break-all`}>
                        <span className="break-all">
                          <span className="sm:hidden">{truncateHash(scriptAddress, 8, 8)}</span>
                          <span className="hidden sm:inline">{truncateHash(scriptAddress, 16, 16)}</span>
                        </span>
                        <ExternalLink size={12} className="shrink-0" />
                      </Link>
                    </div>
                  </div>
                )}

                {vtxo.spentBy && (
                  <div className="col-span-2">
                    <span className="text-arkade-gray uppercase">
                      {(vtxo as any).settledBy ? 'Forfeit Tx:' : 'Spent By:'}
                    </span>
                    <Link to={`/tx/${vtxo.spentBy}`} className={`${mypurple} ml-2 font-mono hover:underline`}>
                      {truncateHash(vtxo.spentBy, 8, 8)}
                    </Link>
                  </div>
                )}

                {(vtxo as any).settledBy && (
                  <div className="col-span-2">
                    <span className="text-arkade-gray uppercase">Settled By:</span>
                    <Link
                      to={`/commitment-tx/${(vtxo as any).settledBy}`}
                      className={`${mypurple} ml-2 font-mono hover:underline`}>
                      {truncateHash((vtxo as any).settledBy, 8, 8)}
                    </Link>
                  </div>
                )}

                {/* Debug toggle */}
                <div className="pt-2 border-t border-arkade-gray/20">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-arkade-gray hover:text-arkade-purple text-xs uppercase font-bold transition-colors"
                  >
                    {showDebug ? '▼ Hide' : '▶ Show'} Raw JSON
                  </button>
                  {showDebug && (
                    <pre className="mt-2 p-2 bg-arkade-black/50 rounded text-xs overflow-x-auto">
                      <code className="text-arkade-gray">{JSON.stringify(vtxo, null, 2)}</code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
