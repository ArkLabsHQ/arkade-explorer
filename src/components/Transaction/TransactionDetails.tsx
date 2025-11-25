import { Card } from '../UI/Card';
import { CopyButton } from '../UI/CopyButton';
import { truncateHash, formatTimestamp, formatSats } from '../../lib/utils';
import * as btc from '@scure/btc-signer';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface TransactionDetailsProps {
  txid: string;
  type: 'commitment' | 'arkade';
  data: any;
}

export function TransactionDetails({ txid, type, data }: TransactionDetailsProps) {
  // Parse PSBT for Arkade transactions
  let parsedTx: btc.Transaction | null = null;
  if (type === 'arkade' && data?.txs?.[0]) {
    try {
      const psbtBase64 = data.txs[0];
      const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
      parsedTx = btc.Transaction.fromPSBT(psbtBytes);
    } catch (e) {
      console.error('Failed to parse PSBT:', e);
    }
  }
  return (
    <div className="space-y-6">
      <Card glowing>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-arkade-purple uppercase">
            {type === 'commitment' ? 'Commitment Transaction' : 'Arkade Transaction'}
          </h1>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
            <span className="text-arkade-gray uppercase text-sm font-bold">Transaction ID</span>
            <div className="flex items-center space-x-2">
              <span className="text-arkade-gray font-mono">{truncateHash(txid, 12, 12)}</span>
              <CopyButton text={txid} />
            </div>
          </div>

          {type === 'commitment' && data && (
            <>
              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Started At</span>
                <span className="text-arkade-gray font-mono">{formatTimestamp(data.startedAt)}</span>
              </div>
              
              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Ended At</span>
                <span className="text-arkade-gray font-mono">{formatTimestamp(data.endedAt)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Total Input Amount</span>
                <span className="text-arkade-orange font-mono font-bold">{formatSats(data.totalInputAmount)} sats</span>
              </div>

              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Total Output Amount</span>
                <span className="text-arkade-orange font-mono font-bold">{formatSats(data.totalOutputAmount)} sats</span>
              </div>

              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Input VTXOs</span>
                <span className="text-arkade-gray font-mono">{data.totalInputVtxos}</span>
              </div>

              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Output VTXOs</span>
                <span className="text-arkade-gray font-mono">{data.totalOutputVtxos}</span>
              </div>
            </>
          )}

          {type === 'arkade' && parsedTx && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Inputs Column */}
              <div>
                <h3 className="text-lg font-bold text-arkade-purple uppercase mb-3">
                  Inputs ({parsedTx.inputsLength})
                </h3>
                <div className="space-y-2">
                  {Array.from({ length: parsedTx.inputsLength }).map((_, i) => {
                    const input = parsedTx!.getInput(i);
                    const inputTxid = input?.txid 
                      ? Array.from(input.txid).reverse().map(b => b.toString(16).padStart(2, '0')).join('')
                      : '';
                    return (
                      <div key={i} className="bg-arkade-black border border-arkade-purple p-3 animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-arkade-gray uppercase">Input #{i}</span>
                          {input?.index !== undefined && (
                            <span className="text-xs text-arkade-gray">vout: {input.index}</span>
                          )}
                        </div>
                        {inputTxid && (
                          <Link 
                            to={`/tx/${inputTxid}`}
                            className="text-xs font-mono text-arkade-purple hover:text-arkade-orange flex items-center space-x-1"
                          >
                            <span>{truncateHash(inputTxid, 12, 12)}</span>
                            <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Outputs Column */}
              <div>
                <h3 className="text-lg font-bold text-arkade-purple uppercase mb-3">
                  Outputs ({parsedTx.outputsLength})
                </h3>
                <div className="space-y-2">
                  {Array.from({ length: parsedTx.outputsLength }).map((_, i) => {
                    const output = parsedTx!.getOutput(i);
                    const amount = output?.amount || 0n;
                    const scriptHex = output?.script 
                      ? Array.from(output.script).map(b => b.toString(16).padStart(2, '0')).join('')
                      : '';
                    const isAnchorOutput = scriptHex.startsWith('51024e73');
                    return (
                      <div key={i} className="bg-arkade-black border border-arkade-purple p-3 animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-arkade-gray uppercase">Output #{i}</span>
                          <span className="text-xs text-arkade-orange font-bold">
                            {formatSats(amount.toString())} sats
                          </span>
                        </div>
                        {scriptHex && (
                          isAnchorOutput ? (
                            <div className="text-xs font-mono text-arkade-gray break-all">
                              <div className="mb-1">Anchor output</div>
                              <div>{scriptHex.substring(0, 40)}...</div>
                            </div>
                          ) : (
                            <Link 
                              to={`/address/${scriptHex}`}
                              className="text-xs font-mono text-arkade-purple hover:text-arkade-orange break-all block"
                            >
                              {scriptHex.substring(0, 40)}...
                            </Link>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
