import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { VtxoList } from '../Address/VtxoList';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { truncateHash, formatTimestamp } from '../../lib/utils';
import { Batch } from '../../lib/api/indexer';
import { indexerClient } from '../../lib/api/indexer';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BatchListProps {
  batches: { [key: string]: Batch };
  commitmentTxid: string;
}

export function BatchList({ batches, commitmentTxid }: BatchListProps) {
  const { resolvedTheme } = useTheme();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [debugBatches, setDebugBatches] = useState<Set<string>>(new Set());
  const moneyColor = resolvedTheme === 'dark' ? 'text-arkade-orange' : 'text-arkade-purple';
  // Filter out batches with 0 amount
  const batchEntries = Object.entries(batches).filter(([_, batch]) => 
    batch.totalOutputAmount && parseInt(batch.totalOutputAmount) > 0
  );

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const toggleDebug = (batchId: string) => {
    setDebugBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  if (batchEntries.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-arkade-purple uppercase mb-4">Batches ({batchEntries.length})</h2>
      <div className="space-y-4">
        {batchEntries.map(([outpoint, batch], index) => {
          const isExpanded = expandedBatches.has(outpoint);
          const showDebug = debugBatches.has(outpoint);
          const vout = parseInt(outpoint, 10);
          
          return (
            <div key={outpoint} className="border border-arkade-purple p-4 space-y-3">
              <div className="w-full flex items-center justify-between hover:bg-arkade-purple hover:bg-opacity-10 transition-colors p-2 rounded">
                <button 
                  onClick={() => toggleBatch(outpoint)}
                  className="flex items-center space-x-2 flex-1"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <span className="text-arkade-gray font-mono text-sm font-bold">Batch #{index + 1}</span>
                </button>
                {batch.swept && (
                  <div className="flex items-center">
                    <Badge variant="danger">Swept</Badge>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-arkade-gray uppercase text-xs sm:text-sm font-bold">Amount</span>
                  <MoneyDisplay sats={parseInt(batch.totalOutputAmount.toString())} valueClassName={`${moneyColor} font-bold font-mono text-xs sm:text-sm`} unitClassName={`${moneyColor} font-bold font-mono text-xs sm:text-sm`} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-arkade-gray uppercase text-xs sm:text-sm font-bold">VTXOs</span>
                  <span className="text-arkade-gray font-mono text-xs sm:text-sm">{batch.totalOutputVtxos}</span>
                </div>
                
                <div>
                  <span className="text-arkade-gray uppercase block mb-1 text-xs sm:text-sm font-bold">Expires At</span>
                  <span className="text-arkade-gray font-mono text-xs block break-all">{formatTimestamp(batch.expiresAt)}</span>
                </div>
              </div>

              {isExpanded && (
                <BatchTreeContent commitmentTxid={commitmentTxid} vout={vout} />
              )}
              
              {/* Debug toggle */}
              <div className="pt-2 border-t border-arkade-gray/20">
                <button
                  onClick={() => toggleDebug(outpoint)}
                  className="text-arkade-gray hover:text-arkade-purple text-xs uppercase font-bold transition-colors"
                >
                  {showDebug ? '▼ Hide' : '▶ Show'} Raw JSON
                </button>
                {showDebug && (
                  <pre className="mt-2 p-2 bg-arkade-black/50 rounded text-xs overflow-x-auto">
                    <code className="text-arkade-gray">{JSON.stringify(batch, null, 2)}</code>
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Component to display tree and VTXOs for a batch
function BatchTreeContent({ commitmentTxid, vout }: { commitmentTxid: string; vout: number }) {
  // Fetch tree and leaves data
  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['vtxo-tree', commitmentTxid, vout],
    queryFn: () => indexerClient.getVtxoTree({ txid: commitmentTxid, vout }),
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['vtxo-leaves', commitmentTxid, vout],
    queryFn: () => indexerClient.getVtxoTreeLeaves({ txid: commitmentTxid, vout }),
  });

  // Get unique txids from leaves to fetch virtual transactions
  const leafTxids = [...new Set(leavesData?.leaves?.map((leaf: any) => leaf.txid) || [])];

  const { data: virtualTxsData, isLoading: virtualTxsLoading } = useQuery({
    queryKey: ['virtual-txs', leafTxids],
    queryFn: async () => {
      if (leafTxids.length === 0) return { txs: [] };
      const response = await indexerClient.getVirtualTxs(leafTxids as string[]);
      const results = response.txs.map((tx: string, idx: number) => ({
        txid: leafTxids[idx],
        tx: tx
      }));
      return { txs: results };
    },
    enabled: leafTxids.length > 0,
  });

  // Fetch full VTXO data
  const leafOutpoints = leavesData?.leaves?.map((leaf: any) => ({
    txid: leaf.txid,
    vout: leaf.vout,
  })) || [];

  // Serialize outpoints for stable query key
  const outpointsKey = JSON.stringify(leafOutpoints);

  const { data: vtxosData, isLoading: vtxosLoading } = useQuery({
    queryKey: ['vtxos-by-outpoints', outpointsKey],
    queryFn: () => {
      console.log('[BatchList] Fetching VTXOs by outpoints:', leafOutpoints);
      console.trace('[BatchList] Stack trace for VTXO fetch');
      return indexerClient.getVtxos({ outpoints: leafOutpoints });
    },
    enabled: leafOutpoints.length > 0,
  });

  const isLoading = treeLoading || leavesLoading || vtxosLoading || virtualTxsLoading;

  // Enrich VTXOs with PSBT data
  const enrichedVtxos = React.useMemo(() => {
    if (!vtxosData?.vtxos || !virtualTxsData?.txs) {
      return vtxosData?.vtxos || [];
    }
    
    return vtxosData.vtxos.map((vtxo: any) => {
      const virtualTx = virtualTxsData.txs.find((t: any) => t.txid === vtxo.txid);
      if (virtualTx?.tx) {
        return { ...vtxo, _psbt: virtualTx.tx };
      }
      return vtxo;
    });
  }, [vtxosData, virtualTxsData]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mt-4 space-y-4 border-t border-arkade-purple pt-4">
      {/* Tree Structure */}
      {treeData?.vtxoTree && treeData.vtxoTree.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-arkade-purple uppercase mb-2">Tree Structure</h4>
          <div className="space-y-1">
            {(() => {
              const allChildTxids = new Set<string>();
              treeData.vtxoTree.forEach((node: any) => {
                if (node.children) {
                  Object.values(node.children).forEach((childTxid: any) => {
                    allChildTxids.add(childTxid);
                  });
                }
              });
              
              return treeData.vtxoTree
                .filter((node: any) => !allChildTxids.has(node.txid))
                .map((node: any, idx: number) => {
                  const hasChildren = node.children && Object.keys(node.children).length > 0;
                  const childTxids = hasChildren ? Object.values(node.children) : [];
                  
                  return (
                    <div key={idx} className="border-l-2 border-arkade-purple pl-2 sm:pl-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link 
                          to={`/tx/${node.txid}`}
                          className="font-mono text-xs sm:text-sm text-arkade-purple hover:underline font-bold break-all"
                        >
                          {truncateHash(node.txid, 8, 8)}
                        </Link>
                        {hasChildren && (
                          <span className="text-xs text-arkade-gray whitespace-nowrap">
                            ({childTxids.length} children)
                          </span>
                        )}
                      </div>
                      
                      {hasChildren && (
                        <div className="ml-6 mt-2 space-y-1">
                          {childTxids.map((childTxid: any, childIdx: number) => (
                            <div key={childIdx} className="flex items-center space-x-2 text-xs">
                              <span className="text-arkade-gray">↳</span>
                              <Link 
                                to={`/tx/${childTxid}`}
                                className="font-mono text-arkade-purple hover:underline break-all"
                              >
                                <span className="sm:hidden">{truncateHash(childTxid, 6, 6)}</span>
                                <span className="hidden sm:inline">{truncateHash(childTxid, 10, 10)}</span>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
            })()}
          </div>
        </div>
      )}

      {/* VTXO Leaves */}
      {enrichedVtxos && enrichedVtxos.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-arkade-purple uppercase mb-2">
            VTXOs ({enrichedVtxos.length})
          </h4>
          <VtxoList vtxos={enrichedVtxos} showScript={true} />
        </div>
      )}
    </div>
  );
}
