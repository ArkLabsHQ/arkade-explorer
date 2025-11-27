import { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { truncateHash, formatTimestamp, formatSats, copyToClipboard } from '../../lib/utils';
import * as btc from '@scure/btc-signer';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Check, ExternalLink } from 'lucide-react';
import { useServerInfo } from '../../contexts/ServerInfoContext';
import { useTheme } from '../../contexts/ThemeContext';
import { constructArkAddress } from '../../lib/arkAddress';
import type { VirtualCoin } from '../../lib/api/indexer';
import { indexerClient } from '../../lib/api/indexer';
import { hex } from '@scure/base';

interface TransactionDetailsProps {
  txid: string;
  type: 'commitment' | 'arkade';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  vtxoData?: VirtualCoin[];
}


export function TransactionDetails({ txid, type, data, vtxoData }: TransactionDetailsProps) {
  const { serverInfo } = useServerInfo();
  const { resolvedTheme } = useTheme();
  const [copiedTxid, setCopiedTxid] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [checkpointVtxo, setCheckpointVtxo] = useState<VirtualCoin | null>(null);
  const [forfeitVtxo, setForfeitVtxo] = useState<VirtualCoin | null>(null);
  
  // Link color: white in dark mode, purple in light mode
  const linkColor = resolvedTheme === 'dark' ? 'text-white' : 'text-arkade-purple';
  
  // Parse PSBT for Arkade transactions
  let parsedTx: btc.Transaction | null = null;
  let forfeitScriptHex = '';
  let forfeitAddress = '';
  let isForfeitTx = false;
  let isCheckpointTx = false;
  
  if (type === 'arkade' && data?.txs?.[0]) {
    try {
      const psbtBase64 = data.txs[0];
      const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
      parsedTx = btc.Transaction.fromPSBT(psbtBytes);
      
      // Get forfeit pubkey from server info
      if (serverInfo?.forfeitPubkey && parsedTx) {
        try {
          const forfeitPubkeyHex = serverInfo.forfeitPubkey;
          
          // Convert hex pubkey to bytes for P2WPKH script creation
          const pubkeyBytes = Uint8Array.from(
            forfeitPubkeyHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
          );
          
          // Create P2WPKH script from pubkey
          const p2wpkhOutput = btc.p2wpkh(pubkeyBytes, serverInfo.network === 'bitcoin' ? btc.NETWORK : btc.TEST_NETWORK);
          forfeitScriptHex = Array.from(p2wpkhOutput.script).map(b => b.toString(16).padStart(2, '0')).join('');
          forfeitAddress = p2wpkhOutput.address || '';
          
          // Check if this is a forfeit tx (only 1 non-anchor output to forfeit address)
          let nonAnchorOutputs = 0;
          let forfeitOutputs = 0;
          
          for (let i = 0; i < parsedTx.outputsLength; i++) {
            const output = parsedTx.getOutput(i);
            const scriptHex = output?.script 
              ? Array.from(output.script).map(b => b.toString(16).padStart(2, '0')).join('')
              : '';
            const isAnchor = scriptHex.startsWith('51024e73');
            
            if (!isAnchor) {
              nonAnchorOutputs++;
              if (scriptHex === forfeitScriptHex) {
                forfeitOutputs++;
              }
            }
          }
          
          isForfeitTx = nonAnchorOutputs === 1 && forfeitOutputs === 1;
        } catch (e) {
          console.error('Failed to generate forfeit script:', e);
        }
      }
      
      // Check if this is a checkpoint tx (only if not already identified as forfeit)
      // Checkpoint tx: 1 input, 1 output (+ anchor), with tapLeafScript containing checkpoint tapscript
      if (!isForfeitTx && parsedTx && serverInfo?.checkpointTapscript) {
        try {
          const inputsCount = parsedTx.inputsLength;
          let nonAnchorOutputCount = 0;
          let nonAnchorOutput;
          for (let i = 0; i < parsedTx.outputsLength; i++) {
            const output = parsedTx.getOutput(i);
            const scriptHex = output?.script 
              ? Array.from(output.script).map(b => b.toString(16).padStart(2, '0')).join('')
              : '';
            const isAnchor = scriptHex.startsWith('51024e73');
            
            if (!isAnchor) {
              nonAnchorOutputCount++;
              nonAnchorOutput = output;
            }
          }
          
          // Check if it's 1 input, 1 non-anchor output structure
          if (inputsCount === 1 && nonAnchorOutputCount === 1) {
            // Check if the input has tapLeafScript with checkpoint tapscript
          
            if (nonAnchorOutput?.tapTree && nonAnchorOutput.tapTree.length > 0) {
              // Check if the tapTree contains the checkpoint tapscript
              const checkpointTapscript = hex.decode(serverInfo.checkpointTapscript);
              for (const tree of nonAnchorOutput.tapTree) {
// compare checkpointTapscript with tree.script
                isCheckpointTx = ArrayBuffer.isView(checkpointTapscript) && 
                                ArrayBuffer.isView(tree.script) &&
                                checkpointTapscript.byteLength === tree.script.byteLength &&
                                new Uint8Array(checkpointTapscript).every((val, i) => val === new Uint8Array(tree.script)[i]);

                if (isCheckpointTx) break;
              }
             
            }
          }
        } catch (e) {
          console.error('Failed to detect checkpoint tx:', e);
        }
      }
    } catch (e) {
      console.error('Failed to parse PSBT:', e);
    }
  }

  // Fetch checkpoint VTXO if this is a checkpoint transaction
  useEffect(() => {
    if (isCheckpointTx && parsedTx && parsedTx.inputsLength > 0) {
      const input = parsedTx.getInput(0);
      if (input?.txid && input?.index !== undefined) {
        const inputTxid = Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('');
        
        indexerClient.getVtxos({ outpoints: [{ txid: inputTxid, vout: input.index }] })
          .then(result => {
            if (result?.vtxos && result.vtxos.length > 0) {
              setCheckpointVtxo(result.vtxos[0]);
            }
          })
          .catch((err: Error) => {
            console.error('Failed to fetch checkpoint VTXO:', err);
          });
      }
    }
  }, [isCheckpointTx, parsedTx]);

  // Fetch forfeit VTXO if this is a forfeit transaction
  useEffect(() => {
    if (isForfeitTx && parsedTx && parsedTx.inputsLength > 0) {
      const input = parsedTx.getInput(0);
      if (input?.txid && input?.index !== undefined) {
        const inputTxid = Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('');
        
        indexerClient.getVtxos({ outpoints: [{ txid: inputTxid, vout: input.index }] })
          .then(result => {
            if (result?.vtxos && result.vtxos.length > 0) {
              setForfeitVtxo(result.vtxos[0]);
            }
          })
          .catch((err: Error) => {
            console.error('Failed to fetch forfeit VTXO:', err);
          });
      }
    }
  }, [isForfeitTx, parsedTx]);

  // Get timestamps from VTXO data
  const firstVtxo = vtxoData?.[0];
  const createdAt = firstVtxo?.createdAt;
  const expiresAt = firstVtxo?.virtualStatus?.batchExpiry;
  
  // Format timestamps defensively - createdAt can be Date or number
  const formatCreatedAt = () => {
    if (!createdAt) return null;
    
    let timestamp: number;
    if (createdAt instanceof Date) {
      timestamp = createdAt.getTime();
    } else if (typeof createdAt === 'number') {
      // If the number is less than a reasonable year 2000 timestamp in ms, it's likely in seconds
      timestamp = createdAt < 10000000000 ? createdAt * 1000 : createdAt;
    } else {
      timestamp = new Date(createdAt).getTime();
    }
    
    return formatTimestamp(timestamp);
  };
  
  // Format expiry - batchExpiry is typically a Unix timestamp in seconds
  const formatExpiresAt = () => {
    if (typeof expiresAt !== 'number') return null;
    // If the number is less than a reasonable year 2000 timestamp in ms, it's likely in seconds
    const timestamp = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
    return formatTimestamp(timestamp);
  };
  return (
    <div className="space-y-6">
      <Card glowing>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-arkade-purple uppercase">
            {type === 'commitment' ? 'Commitment Transaction' : isCheckpointTx ? 'Checkpoint Transaction' : isForfeitTx ? 'Forfeit Transaction' : 'Arkade Transaction'}
          </h1>
        </div>
        
        <div className="space-y-4">
          <div className="border-b border-arkade-purple pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-arkade-gray uppercase text-sm font-bold">Transaction ID</span>
              <button
                onClick={() => {
                  copyToClipboard(txid);
                  setCopiedTxid(true);
                  setTimeout(() => setCopiedTxid(false), 2000);
                }}
                className="p-1 hover:text-arkade-purple transition-colors flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedTxid ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <button
              onClick={() => {
                copyToClipboard(txid);
                setCopiedTxid(true);
                setTimeout(() => setCopiedTxid(false), 2000);
              }}
              className={`${linkColor} font-mono text-xs sm:text-sm hover:font-bold transition-all cursor-pointer break-all w-full text-left`}
              title="Click to copy full txid"
            >
              <span className="sm:hidden">{truncateHash(txid, 8, 8)}</span>
              <span className="hidden sm:inline md:hidden">{truncateHash(txid, 12, 12)}</span>
              <span className="hidden md:inline lg:hidden">{truncateHash(txid, 16, 16)}</span>
              <span className="hidden lg:inline">{truncateHash(txid, 20, 20)}</span>
            </button>
          </div>

          {type === 'commitment' && (
            <div className="border-b border-arkade-purple pb-2">
              <a
                href={`https://mempool.space/${serverInfo?.network === 'bitcoin' ? '' : 'testnet/'}tx/${txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkColor} hover:text-arkade-orange text-sm font-bold uppercase flex items-center gap-2 transition-colors`}
              >
                <ExternalLink size={16} />
                View on Mempool.space
              </a>
            </div>
          )}

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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Inputs Column */}
                <div>
                  <h3 className="text-lg font-bold text-arkade-purple uppercase mb-3">
                    Inputs ({parsedTx.inputsLength})
                  </h3>
                <div className="space-y-2">
                  {Array.from({ length: parsedTx.inputsLength }).map((_, i) => {
                    const input = parsedTx!.getInput(i);
                    // Note: input.txid from PSBT is already in the correct display format (big-endian)
                    const inputTxid = input?.txid 
                      ? Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('')
                      : '';
                    
                    // Extract amount and script from witness UTXO
                    let inputAmount: bigint | null = null;
                    let inputArkAddress = '';
                    
                    if (input?.witnessUtxo) {
                      inputAmount = input.witnessUtxo.amount;
                      
                      // Try to construct Ark address from witness UTXO script
                      if (input.witnessUtxo.script && serverInfo?.signerPubkey && serverInfo?.network) {
                        try {
                          const addr = constructArkAddress(input.witnessUtxo.script, serverInfo.signerPubkey, serverInfo.network);
                          if (addr) {
                            inputArkAddress = addr;
                          }
                        } catch (e) {
                          console.error('Failed to construct Ark address for input:', e);
                        }
                      }
                    }
                    
                    return (
                      <div key={i} className="flex items-center gap-2 animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="w-8 flex items-center justify-center flex-shrink-0">
                          {inputTxid && (
                            <Link 
                              to={`/tx/${inputTxid}`}
                              className="arrow-nav-button bg-arkade-purple text-white border-2 border-arkade-purple hover:bg-arkade-orange hover:border-arkade-orange transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center"
                              title={`From: ${inputTxid}`}
                            >
                              <ArrowRight size={16} />
                            </Link>
                          )}
                        </div>
                        <div className="bg-arkade-black border border-arkade-purple p-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-arkade-gray uppercase">Input #{i}</span>
                            <div className="flex items-center gap-2">
                              {inputAmount !== null && (
                                <span className="text-xs text-arkade-orange font-bold">
                                  {formatSats(inputAmount.toString())} sats
                                </span>
                              )}
                            </div>
                          </div>
                          {inputArkAddress && (
                            <Link 
                              to={`/address/${inputArkAddress}`}
                              className={`text-xs font-mono ${linkColor} hover:text-arkade-orange flex items-center space-x-1`}
                            >
                              <span>{truncateHash(inputArkAddress, 12, 12)}</span>
                              <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
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
                    const isForfeitOutput = isForfeitTx && scriptHex === forfeitScriptHex;
                    
                    // Find the corresponding VTXO for this output
                    // For checkpoint/forfeit transactions, use the fetched VTXO (but ignore anchor outputs)
                    const vtxo = (isCheckpointTx && !isAnchorOutput) 
                      ? checkpointVtxo 
                      : (isForfeitTx && !isAnchorOutput) 
                        ? forfeitVtxo 
                        : vtxoData?.find(v => v.vout === i);
                    const isSpent = (isCheckpointTx && !isAnchorOutput) || (isForfeitTx && !isAnchorOutput) 
                      ? true 
                      : ((vtxo as any)?.isSpent === true || (vtxo?.spentBy && vtxo.spentBy !== ''));
                    const spendingTxid = (isCheckpointTx && !isAnchorOutput && checkpointVtxo?.arkTxId)
                      ? checkpointVtxo.arkTxId 
                      : (isForfeitTx && !isAnchorOutput && forfeitVtxo?.settledBy)
                        ? forfeitVtxo.settledBy
                        : (vtxo?.spentBy && vtxo.spentBy !== '' ? vtxo.spentBy : null);
                    
                    // Try to construct Ark address for non-anchor, non-forfeit, non-checkpoint outputs
                    let arkAddress = '';
                    if (!isAnchorOutput && !isForfeitOutput && !isCheckpointTx && output?.script && serverInfo?.signerPubkey && serverInfo?.network) {
                      try {
                        const addr = constructArkAddress(output.script, serverInfo.signerPubkey, serverInfo.network);
                        if (addr) {
                          arkAddress = addr;
                        }
                      } catch (e) {
                        console.error('Failed to construct Ark address:', e);
                      }
                    }
                    
                    return (
                      <div key={i} className="flex items-center gap-2 animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="bg-arkade-black border border-arkade-purple p-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-arkade-gray uppercase">Output #{i}</span>
                            <div className="flex items-center gap-2">
                              {vtxo && !isAnchorOutput && isSpent && (
                                <span className="text-xs font-bold uppercase text-red-400">
                                  Spent
                                </span>
                              )}
                              <span className="text-xs text-arkade-orange font-bold">
                                {formatSats(amount.toString())} sats
                              </span>
                            </div>
                          </div>
                          {isForfeitOutput && (
                            <>
                              <div className="text-xs text-arkade-orange font-bold uppercase mb-1">Arkade Operator</div>
                              {forfeitAddress && (
                                <div className="text-xs font-mono text-arkade-gray break-all">
                                  {forfeitAddress}
                                </div>
                              )}
                            </>
                          )}
                          {!isForfeitOutput && arkAddress && (
                            <Link 
                              to={`/address/${arkAddress}`}
                              className={`text-xs font-mono ${linkColor} hover:text-arkade-orange flex items-center space-x-1 mb-1`}
                            >
                              <span>{truncateHash(arkAddress, 12, 12)}</span>
                              <ArrowRight size={12} />
                            </Link>
                          )}
                          {!isForfeitOutput && !arkAddress && scriptHex && (
                            isAnchorOutput ? (
                              <div className="text-xs font-mono text-arkade-gray break-all">
                                <div className="mb-1">Anchor output</div>
                                <div>{scriptHex.substring(0, 40)}...</div>
                              </div>
                            ) : (
                              <Link 
                                to={`/address/${scriptHex}`}
                                className="text-xs font-mono text-arkade-gray hover:text-arkade-purple break-all block"
                              >
                                {scriptHex.substring(0, 40)}...
                              </Link>
                            )
                          )}
                        </div>
                        <div className="w-8 flex items-center justify-center flex-shrink-0">
                          {isSpent && spendingTxid && (
                            <Link 
                              to={`/tx/${spendingTxid}`}
                              className="arrow-nav-button bg-arkade-purple text-white border-2 border-arkade-purple hover:bg-arkade-orange hover:border-arkade-orange transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center"
                              title={`Spent in: ${spendingTxid}`}
                            >
                              <ArrowRight size={16} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {formatCreatedAt() && (
              <div className="flex items-center justify-between border-b border-arkade-purple pb-2 mt-6">
                <span className="text-arkade-gray uppercase text-sm font-bold">Created At</span>
                <span className="text-arkade-gray font-mono">{formatCreatedAt()}</span>
              </div>
            )}
            
            {formatExpiresAt() && (
              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Expires At</span>
                <span className="text-arkade-gray font-mono">{formatExpiresAt()}</span>
              </div>
            )}
            </>
          )}
          
          {/* Debug toggle */}
          <div className="pt-4 border-t border-arkade-gray/20">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-arkade-gray hover:text-arkade-purple text-xs uppercase font-bold transition-colors"
            >
              {showDebug ? '▼ Hide' : '▶ Show'} Raw JSON
            </button>
            {showDebug && (
              <pre className="mt-2 p-2 bg-arkade-black/50 rounded text-xs overflow-x-auto">
                <code className="text-arkade-gray">{JSON.stringify(parsedTx ? {
                  type: type === 'commitment' ? 'Commitment Transaction' : isCheckpointTx ? 'Checkpoint Transaction' : isForfeitTx ? 'Forfeit Transaction' : 'Arkade Transaction',
                  txid,
                  version: parsedTx.version,
                  lockTime: parsedTx.lockTime,
                  inputsCount: parsedTx.inputsLength,
                  inputs: Array.from({ length: parsedTx.inputsLength }).map((_, i) => {
                    const input = parsedTx!.getInput(i);
                    return {
                      index: input?.index,
                      txid: input?.txid ? Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('') : null,
                      sequence: input?.sequence,
                      witnessUtxo: input?.witnessUtxo ? {
                        amount: input.witnessUtxo.amount.toString(),
                        scriptHex: Array.from(input.witnessUtxo.script).map(b => b.toString(16).padStart(2, '0')).join(''),
                      } : null,
                    };
                  }),
                  outputsCount: parsedTx.outputsLength,
                  outputs: Array.from({ length: parsedTx.outputsLength }).map((_, i) => {
                    const output = parsedTx!.getOutput(i);
                    const scriptHex = output?.script ? Array.from(output.script).map(b => b.toString(16).padStart(2, '0')).join('') : '';
                    const isAnchor = scriptHex.startsWith('51024e73');
                    const vtxo = vtxoData?.find(v => v.vout === i);
                    const isSpent = (vtxo as any)?.isSpent === true || (vtxo?.spentBy && vtxo.spentBy !== '');
                    
                    return {
                      amount: output?.amount?.toString(),
                      scriptHex,
                      isAnchor,
                      isForfeit: isForfeitTx && scriptHex === forfeitScriptHex,
                      vtxoStatus: !isAnchor && vtxo ? {
                        spent: isSpent,
                        spentBy: (vtxo.spentBy && vtxo.spentBy !== '') ? vtxo.spentBy : null,
                        createdAt: vtxo.createdAt,
                        expiresAt: (vtxo as any).virtualStatus?.batchExpiry || null,
                        isPreconfirmed: (vtxo as any).isPreconfirmed,
                        isSwept: (vtxo as any).isSwept,
                      } : null,
                    };
                  }),
                } : data, null, 2)}</code>
              </pre>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
