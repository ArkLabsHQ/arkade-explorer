import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { VtxoList } from '../Address/VtxoList';
import { truncateHash, formatTimestamp, formatSats } from '../../lib/utils';
import { Batch } from '../../lib/api/indexer';
import { indexerClient } from '../../lib/api/indexer';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as React from 'react';

interface BatchListProps {
  batches: { [key: string]: Batch };
  commitmentTxid: string;
}

export function BatchList({ batches, commitmentTxid }: BatchListProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const batchEntries = Object.entries(batches);

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

  if (batchEntries.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-arkade-purple uppercase mb-4">Batches ({batchEntries.length})</h2>
      <div className="space-y-4">
        {batchEntries.map(([outpoint, batch], index) => {
          const isExpanded = expandedBatches.has(outpoint);
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
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-arkade-gray uppercase block mb-1">Amount</span>
                  <span className="text-arkade-orange font-bold font-mono">{formatSats(batch.totalOutputAmount)} sats</span>
                </div>
                
                <div>
                  <span className="text-arkade-gray uppercase block mb-1">VTXOs</span>
                  <span className="text-arkade-gray font-mono">{batch.totalOutputVtxos}</span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-arkade-gray uppercase block mb-1">Expires At</span>
                  <span className="text-arkade-gray font-mono text-xs">{formatTimestamp(batch.expiresAt)}</span>
                </div>
              </div>

              {isExpanded && (
                <BatchTreeContent commitmentTxid={commitmentTxid} vout={vout} />
              )}
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

  const { data: vtxosData, isLoading: vtxosLoading } = useQuery({
    queryKey: ['vtxos-by-outpoints', leafOutpoints],
    queryFn: () => indexerClient.getVtxos({ outpoints: leafOutpoints }),
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
                    <div key={idx} className="border-l-2 border-arkade-purple pl-4 py-2">
                      <div className="flex items-center space-x-2">
                        <Link 
                          to={`/tx/${node.txid}`}
                          className="font-mono text-sm text-arkade-purple hover:underline font-bold"
                        >
                          {truncateHash(node.txid, 12, 12)}
                        </Link>
                        {hasChildren && (
                          <span className="text-xs text-arkade-gray">
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
                                className="font-mono text-arkade-purple hover:underline"
                              >
                                {truncateHash(childTxid, 10, 10)}
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
