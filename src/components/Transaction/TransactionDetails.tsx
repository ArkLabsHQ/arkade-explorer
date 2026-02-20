import { useState, useEffect, useRef } from 'react';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { truncateHash, formatTimestamp, copyToClipboard } from '../../lib/utils';
import * as btc from '@scure/btc-signer';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Check, ExternalLink, Pin, PinOff } from 'lucide-react';
import { useServerInfo } from '../../contexts/ServerInfoContext';
import { useTheme } from '../../contexts/ThemeContext';
import { constructArkAddress } from '../../lib/arkAddress';
import type { VirtualCoin } from '../../lib/api/indexer';
import { indexerClient } from '../../lib/api/indexer';
import { AssetBadge } from '../UI/AssetBadge';
import { AssetAmountDisplay } from '../UI/AssetAmountDisplay';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { useQueries } from '@tanstack/react-query';
import { hex } from '@scure/base';
import { CosignerPublicKey, getArkPsbtFields, asset } from '@arkade-os/sdk';
const { Packet } = asset;

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
  const { pinSearch, unpinSearch, isPinned } = useRecentSearches();
  const [copiedTxid, setCopiedTxid] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [checkpointVtxo, setCheckpointVtxo] = useState<VirtualCoin | null>(null);
  const [forfeitVtxo, setForfeitVtxo] = useState<VirtualCoin | null>(null);
  
  // Link color: white in dark mode, purple in light mode
  const linkColor = resolvedTheme === 'dark' ? 'text-white' : 'text-arkade-purple';
  // Money color: orange in dark mode, purple in light mode (for better legibility)
  const moneyColor = resolvedTheme === 'dark' ? 'text-arkade-orange' : 'text-arkade-purple';
  
  // Parse transaction for both Arkade and Commitment transactions
  let parsedTx: btc.Transaction | null = null;
  let forfeitScriptHex = '';
  let forfeitAddress = '';
  let isForfeitTx = false;
  let isCheckpointTx = false;
  let isBatchTreeTx = false;
  let isConnectorTreeTx = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assetPacket: any = null;
  
  // Parse Arkade transactions from PSBT (base64)
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

      // Detect batch tree vs connector tree transactions
      // Tree transactions have cosigner fields in PSBT inputs
      // Batch tree: multiple cosigner fields (musig)
      // Connector tree: exactly 1 cosigner field (and pubkey = output P2TR key)
      if (!isForfeitTx && !isCheckpointTx && parsedTx) {
        try {

          
          const cosignerFields = getArkPsbtFields(
                parsedTx,
                0,
                CosignerPublicKey
            );
            if (cosignerFields.length > 1) {
              // Multiple cosigner fields = batch tree (musig)
              isBatchTreeTx = true;
            } else if (cosignerFields.length === 1) {
              // Single cosigner field = connector tree
              // Verify that the pubkey matches the output P2TR key

              //cosignerFields[0].key
              //convert to x only pubkey and compare to output P2TR key
              const cosignerPubkey = cosignerFields[0].key.slice(1);

              //first non-anchor output
              const nonAnchorOutput = parsedTx.getOutput(0);
              const decodedOutput = btc.OutScript.decode(nonAnchorOutput.script!);
              
              // Compare the cosigner pubkey with the output pubkey
              if ('pubkey' in decodedOutput && decodedOutput.pubkey &&
                  ArrayBuffer.isView(cosignerPubkey) && ArrayBuffer.isView(decodedOutput.pubkey) &&
                  cosignerPubkey.byteLength === decodedOutput.pubkey.byteLength &&
                  new Uint8Array(cosignerPubkey).every((val, i) => val === new Uint8Array(decodedOutput.pubkey!)[i])) {
                isConnectorTreeTx = true;
              }
            }
          
        } catch (e) {
          console.error('Failed to detect tree transaction type:', e);
        }
      }

      // Detect and parse asset packet from OP_RETURN output
      if (parsedTx) {
        for (let i = 0; i < parsedTx.outputsLength; i++) {
          const output = parsedTx.getOutput(i);
          if (output?.script) {
            try {
              if (Packet.isAssetPacket(output.script)) {
                assetPacket = Packet.fromTxOut(output.script);
                break;
              }
            } catch (e) {
              console.error('Failed to parse asset packet:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse PSBT:', e);
    }
  }

  // Parse Commitment transactions from raw hex
  if (type === 'commitment' && data?.tx) {
    try {
      const txHex = data.tx;
      const txBytes = hex.decode(txHex);
      parsedTx = btc.Transaction.fromRaw(txBytes);
    } catch (e) {
      console.error('Failed to parse commitment transaction hex:', e);
    }
  }

  // Fetch checkpoint VTXO if this is a checkpoint transaction
  const checkpointFetchedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (isCheckpointTx && parsedTx && parsedTx.inputsLength > 0) {
      const input = parsedTx.getInput(0);
      if (input?.txid && input?.index !== undefined) {
        const inputTxid = Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('');
        const outpointKey = `${inputTxid}:${input.index}`;
        
        // Only fetch if we haven't already fetched this outpoint
        if (checkpointFetchedRef.current !== outpointKey) {
          checkpointFetchedRef.current = outpointKey;
          console.log('[TransactionDetails] Fetching checkpoint VTXO:', outpointKey);
          
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
    }
  }, [isCheckpointTx, parsedTx]);

  // Fetch forfeit VTXO if this is a forfeit transaction
  const forfeitFetchedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (isForfeitTx && parsedTx && parsedTx.inputsLength > 0) {
      const input = parsedTx.getInput(0);
      if (input?.txid && input?.index !== undefined) {
        const inputTxid = Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('');
        const outpointKey = `${inputTxid}:${input.index}`;
        
        // Only fetch if we haven't already fetched this outpoint
        if (forfeitFetchedRef.current !== outpointKey) {
          forfeitFetchedRef.current = outpointKey;
          console.log('[TransactionDetails] Fetching forfeit VTXO:', outpointKey);
          
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
    }
  }, [isForfeitTx, parsedTx]);

  // Fetch tree data for each batch to find root transactions
  const batchVouts = type === 'commitment' && data?.batches 
    ? Object.keys(data.batches).map(key => parseInt(key))
    : [];

  const batchTreeQueries = useQueries({
    queries: batchVouts.map(vout => ({
      queryKey: ['vtxo-tree', txid, vout],
      queryFn: () => indexerClient.getVtxoTree({ txid, vout }),
      enabled: type === 'commitment' && !!txid,
    })),
  });

  // Map batch vout to root transaction ID
  const batchRootTxids = new Map<number, string>();
  batchTreeQueries.forEach((query, index) => {
    if (query.data?.vtxoTree && query.data.vtxoTree.length > 0) {
      const tree = query.data.vtxoTree;
      // Find root: node that is not a child of any other node
      const allChildTxids = new Set<string>();
      tree.forEach((node: any) => {
        if (node.children) {
          Object.values(node.children).forEach((childTxid: any) => {
            allChildTxids.add(childTxid);
          });
        }
      });
      const rootNode = tree.find((node: any) => !allChildTxids.has(node.txid));
      if (rootNode) {
        batchRootTxids.set(batchVouts[index], rootNode.txid);
      }
    }
  });

  // Find root connector transaction and fetch it
  const rootConnectorTxid = type === 'commitment' && data?.connectors?.length > 0
    ? (() => {
        const connectors = data.connectors;
        const allChildTxids = new Set<string>();
        connectors.forEach((conn: any) => {
          if (conn.children) {
            Object.values(conn.children).forEach((childTxid: any) => {
              allChildTxids.add(childTxid);
            });
          }
        });
        const rootConnector = connectors.find((conn: any) => !allChildTxids.has(conn.txid));
        return rootConnector?.txid;
      })()
    : null;

  const rootConnectorQueries = useQueries({
    queries: [{
      queryKey: ['virtual-tx', rootConnectorTxid || 'none'],
      queryFn: async () => {
        if (!rootConnectorTxid) return null;
        const result = await indexerClient.getVirtualTxs([rootConnectorTxid]);
        return result.txs[0];
      },
      enabled: !!rootConnectorTxid,
    }],
  });

  // Parse root connector transaction and find which outputs it spends
  const connectorOutputIndices = new Set<number>();
  const rootConnectorData = rootConnectorQueries[0]?.data;
  if (rootConnectorData && typeof rootConnectorData === 'string') {
    try {
      // Check if it's hex (raw tx) or base64 (PSBT)
      const isHex = /^[0-9a-fA-F]+$/.test(rootConnectorData);
      let rootConnectorParsedTx: btc.Transaction | null = null;
      
      if (isHex) {
        const txBytes = hex.decode(rootConnectorData);
        rootConnectorParsedTx = btc.Transaction.fromRaw(txBytes);
      } else {
        const psbtBytes = Uint8Array.from(atob(rootConnectorData), c => c.charCodeAt(0));
        rootConnectorParsedTx = btc.Transaction.fromPSBT(psbtBytes);
      }

      if (rootConnectorParsedTx) {
        // Check each input to see if it spends an output from the current commitment tx
        for (let i = 0; i < rootConnectorParsedTx.inputsLength; i++) {
          const input = rootConnectorParsedTx.getInput(i);
          if (input?.txid) {
            const inputTxid = Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('');
            if (inputTxid === txid) {
              // This input spends an output from the current commitment tx
              connectorOutputIndices.add(input.index ?? 0);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse root connector transaction:', e);
    }
  }

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
            {type === 'commitment' 
              ? 'Commitment Transaction' 
              : isCheckpointTx 
                ? 'Checkpoint Transaction' 
                : isForfeitTx 
                  ? 'Forfeit Transaction'
                  : isBatchTreeTx
                    ? 'Batch Tree Transaction'
                    : isConnectorTreeTx
                      ? 'Connector Tree Transaction'
                      : 'Arkade Transaction'}
          </h1>
          <button
            onClick={() => {
              if (isPinned(txid)) {
                unpinSearch(txid);
              } else {
                pinSearch(txid, type === 'commitment' ? 'commitment-tx' : 'transaction');
              }
            }}
            className={`p-2 transition-colors ${
              isPinned(txid)
                ? 'text-arkade-orange hover:text-arkade-purple'
                : 'text-arkade-gray hover:text-arkade-orange'
            }`}
            title={isPinned(txid) ? 'Unpin from search' : 'Pin to search'}
          >
            {isPinned(txid) ? <PinOff size={20} /> : <Pin size={20} />}
          </button>
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
                <span className="text-arkade-gray uppercase text-sm font-bold">VTXOs</span>
                <span className="text-arkade-gray font-mono">{data.totalInputVtxos} in / {data.totalOutputVtxos} out</span>
              </div>

              <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
                <span className="text-arkade-gray uppercase text-sm font-bold">Amount</span>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  <MoneyDisplay sats={data.totalInputAmount} valueClassName={`${moneyColor} font-mono font-bold`} unitClassName={`${moneyColor} font-mono font-bold`} />
                  <span className="text-arkade-gray font-mono">in /</span>
                  <MoneyDisplay sats={data.totalOutputAmount} valueClassName={`${moneyColor} font-mono font-bold`} unitClassName={`${moneyColor} font-mono font-bold`} />
                  <span className="text-arkade-gray font-mono">out</span>
                </div>
              </div>
            </>
          )}
          
          {type === 'commitment' && parsedTx && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Inputs Column */}
              <div>
                <h3 className="text-lg font-bold text-arkade-purple uppercase mb-3">
                  Inputs ({parsedTx.inputsLength + (data?.forfeitTxids?.length || 0)})
                </h3>
                <div className="space-y-2">
                  {/* Regular inputs from the transaction */}
                  {Array.from({ length: parsedTx.inputsLength }).map((_, i) => {
                    const input = parsedTx!.getInput(i);
                    const inputTxid = input?.txid 
                      ? Array.from(input.txid).map(b => b.toString(16).padStart(2, '0')).join('')
                      : '';
                    
                    return (
                      <div key={`input-${i}`} className="flex items-center gap-2 animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="w-8 flex items-center justify-center flex-shrink-0">
                          {inputTxid && (
                            <a
                              href={`https://mempool.space/${serverInfo?.network === 'bitcoin' ? '' : 'testnet/'}tx/${inputTxid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="arrow-nav-button bg-arkade-purple text-white border-2 border-arkade-purple hover:bg-arkade-orange hover:border-arkade-orange transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center"
                              title={`View on Mempool: ${inputTxid}`}
                            >
                              <ArrowRight size={16} />
                            </a>
                          )}
                        </div>
                        <div className="bg-arkade-black border border-arkade-purple p-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-arkade-gray uppercase">Input #{i}</span>
                          </div>
                          {inputTxid && (
                            <div className="text-xs font-mono text-arkade-gray">
                              {truncateHash(inputTxid, 12, 12)}:{input?.index ?? 0}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Forfeit transactions as inputs */}
                  {data?.forfeitTxids?.map((forfeitTxid: string, i: number) => {
                    const inputIndex = parsedTx!.inputsLength + i;
                    return (
                      <div key={`forfeit-${i}`} className="flex items-center gap-2 animate-slide-in" style={{ animationDelay: `${inputIndex * 0.05}s` }}>
                        <div className="w-8 flex items-center justify-center flex-shrink-0">
                          <Link 
                            to={`/tx/${forfeitTxid}`}
                            className="arrow-nav-button bg-arkade-purple text-white border-2 border-arkade-purple hover:bg-arkade-orange hover:border-arkade-orange transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center"
                            title={`View forfeit tx: ${forfeitTxid}`}
                          >
                            <ArrowRight size={16} />
                          </Link>
                        </div>
                        <div className="bg-arkade-black border border-arkade-orange p-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-arkade-gray uppercase">Input #{inputIndex}</span>
                              <span className="text-xs font-bold uppercase text-arkade-orange">Forfeit</span>
                            </div>
                          </div>
                          <div className="text-xs font-mono text-arkade-gray">
                            {truncateHash(forfeitTxid, 12, 12)}
                          </div>
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
                    
                    // Check if this output corresponds to a batch
                    const batchKey = i.toString();
                    const batch = data?.batches?.[batchKey];
                    const isBatch = batch && parseInt(batch.totalOutputAmount || '0') > 0;
                    
                    // Check if this output is a connector
                    // An output is a connector if the root connector transaction spends it
                    const isConnector = connectorOutputIndices.has(i);
                    const connectorChildTxid = isConnector ? rootConnectorTxid : null;
                    
                    // Determine border color: orange for batch, blue for connector, purple for regular
                    const borderColor = isBatch ? 'border-arkade-orange' : isConnector ? 'border-blue-500' : 'border-arkade-purple';
                    
                    return (
                      <div key={i} className="flex items-center gap-2 animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className={`bg-arkade-black border p-3 flex-1 min-w-0 ${borderColor}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-arkade-gray uppercase">Output #{i}</span>
                              {isBatch && (
                                <span className="text-xs font-bold uppercase text-arkade-orange">
                                  Batch #{parseInt(batchKey) + 1}
                                </span>
                              )}
                              {isConnector && (
                                <span className="text-xs font-bold uppercase text-blue-400">
                                  Connector
                                </span>
                              )}
                            </div>
                            <MoneyDisplay sats={parseInt(amount.toString())} valueClassName={`text-xs ${moneyColor} font-bold`} unitClassName={`text-xs ${moneyColor} font-bold`} />
                          </div>
                          {isBatch && batch && (
                            <div className="text-xs text-arkade-gray mb-1">
                              {batch.totalOutputVtxos} VTXO{batch.totalOutputVtxos !== 1 ? 's' : ''}
                            </div>
                          )}
                          {scriptHex && (
                            <div className="text-xs font-mono text-arkade-gray break-all">
                              {scriptHex.substring(0, 40)}...
                            </div>
                          )}
                        </div>
                        <div className="w-8 flex items-center justify-center flex-shrink-0">
                          {isBatch && batch && batchRootTxids.get(i) && (
                            <Link 
                              to={`/tx/${batchRootTxids.get(i)}`}
                              className="arrow-nav-button bg-arkade-purple text-white border-2 border-arkade-purple hover:bg-arkade-orange hover:border-arkade-orange transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center"
                              title={`View batch root tx: ${batchRootTxids.get(i)}`}
                            >
                              <ArrowRight size={16} />
                            </Link>
                          )}
                          {isConnector && connectorChildTxid && (
                            <Link 
                              to={`/tx/${connectorChildTxid}`}
                              className="arrow-nav-button bg-arkade-purple text-white border-2 border-arkade-purple hover:bg-arkade-orange hover:border-arkade-orange transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center"
                              title={`Connector child tx: ${connectorChildTxid}`}
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
                    let inputScriptHex = '';
                    
                    if (input?.witnessUtxo) {
                      inputAmount = input.witnessUtxo.amount;
                      
                      // Get script hex for display
                      if (input.witnessUtxo.script) {
                        inputScriptHex = hex.encode(input.witnessUtxo.script);
                      }
                      
                      // Try to construct Ark address from witness UTXO script
                      // Show Ark addresses for batch tree transactions, but NOT for connector tree or regular arkade transactions
                      if (isBatchTreeTx && input.witnessUtxo.script && serverInfo?.signerPubkey && serverInfo?.network) {
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
                                <MoneyDisplay sats={parseInt(inputAmount.toString())} valueClassName={`text-xs ${moneyColor} font-bold`} unitClassName={`text-xs ${moneyColor} font-bold`} />
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
                          {!inputArkAddress && inputScriptHex && (
                            <div className="text-xs font-mono text-arkade-gray break-all">
                              {inputScriptHex.substring(0, 40)}...
                            </div>
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
                    // For checkpoint/forfeit/batch tree transactions, use the fetched VTXO (but ignore anchor outputs)
                    const vtxo = (isCheckpointTx && !isAnchorOutput) 
                      ? checkpointVtxo 
                      : (isForfeitTx && !isAnchorOutput) 
                        ? forfeitVtxo 
                        : vtxoData?.find(v => ((v as any).outpoint?.vout ?? (v as any).vout) === i);
                    const isSpent = (isCheckpointTx && !isAnchorOutput) || (isForfeitTx && !isAnchorOutput) || (isBatchTreeTx && !isAnchorOutput)
                      ? ((vtxo as any)?.isSpent === true || (vtxo?.spentBy && vtxo.spentBy !== ''))
                      : ((vtxo as any)?.isSpent === true || (vtxo?.spentBy && vtxo.spentBy !== ''));
                    const spendingTxid = (isCheckpointTx && !isAnchorOutput && checkpointVtxo?.arkTxId)
                      ? checkpointVtxo.arkTxId 
                      : (isForfeitTx && !isAnchorOutput && forfeitVtxo?.settledBy)
                        ? forfeitVtxo.settledBy
                        : (vtxo?.spentBy && vtxo.spentBy !== '' 
                            ? vtxo.spentBy 
                            : ((vtxo as any)?.settledBy && (vtxo as any).settledBy !== '' 
                                ? (vtxo as any).settledBy 
                                : null));
                    
                    // Try to construct Ark address for non-anchor, non-forfeit, non-checkpoint outputs
                    // Show Ark addresses for batch tree transactions, but NOT for connector tree transactions
                    let arkAddress = '';
                    if (!isAnchorOutput && !isForfeitOutput && !isCheckpointTx && !isConnectorTreeTx && output?.script && serverInfo?.signerPubkey && serverInfo?.network) {
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
                              {vtxo && !isAnchorOutput && isSpent && <Badge variant="danger">Spent</Badge>}
                              {vtxo && !isAnchorOutput && !isSpent && <Badge variant="success">Unspent</Badge>}
                              <MoneyDisplay sats={parseInt(amount.toString())} valueClassName={`text-xs ${moneyColor} font-bold`} unitClassName={`text-xs ${moneyColor} font-bold`} />
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
                            ) : isConnectorTreeTx ? (
                              <div className="text-xs font-mono text-arkade-gray break-all">
                                {scriptHex.substring(0, 40)}...
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
                          {/* Asset info from VTXO data */}
                          {vtxo?.assets && vtxo.assets.length > 0 && !isAnchorOutput && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {vtxo.assets.map((a, ai) => (
                                <div key={ai} className="flex items-center gap-1">
                                  <AssetBadge assetId={a.assetId} />
                                  <AssetAmountDisplay
                                    amount={a.amount}
                                    assetId={a.assetId}
                                    valueClassName={`text-xs ${moneyColor} font-bold`}
                                    unitClassName={`text-xs ${moneyColor}`}
                                  />
                                </div>
                              ))}
                            </div>
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
            
            {assetPacket && assetPacket.groups.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-arkade-purple uppercase mb-3">
                  Asset Packet
                </h3>
                <div className="space-y-3">
                  {assetPacket.groups.map((group: any, gi: number) => {
                    const assetIdStr = group.assetId?.toString() || 'Unknown';
                    const isIssuance = group.isIssuance();
                    return (
                      <div key={gi} className="bg-arkade-black border border-arkade-purple p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <AssetBadge assetId={assetIdStr} />
                            {isIssuance && <Badge variant="success">Issuance</Badge>}
                          </div>
                        </div>

                        {group.inputs.length > 0 && (
                          <div>
                            <span className="text-xs text-arkade-gray uppercase font-bold">Inputs</span>
                            <div className="ml-2 space-y-0.5 mt-0.5">
                              {group.inputs.map((inp: any, ii: number) => (
                                <div key={ii} className="text-xs font-mono text-arkade-gray">
                                  vin:{inp.vin} &rarr; <span className={moneyColor}>{inp.amount.toString()}</span> units
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {group.outputs.length > 0 && (
                          <div>
                            <span className="text-xs text-arkade-gray uppercase font-bold">Outputs</span>
                            <div className="ml-2 space-y-0.5 mt-0.5">
                              {group.outputs.map((out: any, oi: number) => (
                                <div key={oi} className="text-xs font-mono text-arkade-gray">
                                  vout:{out.vout} &rarr; <span className={moneyColor}>{out.amount.toString()}</span> units
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                <code className="text-arkade-gray">{JSON.stringify(type === 'commitment' && !parsedTx ? {
                  // Show raw commitment data if transaction parsing failed
                  rawData: data,
                  note: 'Transaction parsing failed - check if data.tx field exists'
                } : parsedTx ? {
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
