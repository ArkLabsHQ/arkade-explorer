import { useState } from 'react';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { indexerClient } from '../../lib/api/indexer';
import { Card } from '../UI/Card';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { VtxoList } from '../Address/VtxoList';
import { truncateHash } from '../../lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TreeViewerProps {
  commitmentTxid: string;
  batches: { [key: string]: any };
}

export function TreeViewer({ commitmentTxid, batches }: TreeViewerProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [showConnectors, setShowConnectors] = useState(false);
  
  console.log('TreeViewer batches:', batches);
  console.log('commitmentTxid:', commitmentTxid);

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

  // Fetch connectors
  const { data: connectorsData, isLoading: connectorsLoading, error: connectorsError } = useQuery({
    queryKey: ['connectors', commitmentTxid],
    queryFn: () => indexerClient.getCommitmentTxConnectors(commitmentTxid),
    enabled: showConnectors,
  });

  const batchEntries = Object.entries(batches);

  if (batchEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connectors Section */}
      <Card>
        <button
          onClick={() => setShowConnectors(!showConnectors)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            {showConnectors ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <h3 className="text-lg font-bold text-arkade-purple uppercase">
              Connector Tree
            </h3>
          </div>
        </button>

        {showConnectors && (
          <div className="mt-4">
            {connectorsLoading ? (
              <LoadingSpinner />
            ) : connectorsError ? (
              <p className="text-arkade-orange text-sm">Error: {(connectorsError as Error).message}</p>
            ) : connectorsData?.connectors && connectorsData.connectors.length > 0 ? (
              <div className="space-y-2">
                {connectorsData.connectors.map((connector: any, idx: number) => (
                  <div key={idx} className="border border-arkade-purple p-3 font-mono text-sm">
                    <div className="text-arkade-gray">
                      Level: {connector.level || 0} | Parent: {connector.parentTxid || 'root'}
                    </div>
                    <div className="text-arkade-purple">{connector.txid}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-arkade-gray mb-2">Debug info:</p>
                <pre className="text-xs text-arkade-gray bg-black p-2 overflow-auto">
                  {JSON.stringify(connectorsData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* VTXO Trees for each batch */}
      {batchEntries.map(([batchId, batch], index) => (
        <VtxoTreeSection
          key={batchId}
          batchId={batchId}
          batchIndex={index}
          batch={batch}
          commitmentTxid={commitmentTxid}
          isExpanded={expandedBatches.has(batchId)}
          onToggle={() => toggleBatch(batchId)}
        />
      ))}
    </div>
  );
}

interface VtxoTreeSectionProps {
  batchId: string;
  batchIndex: number;
  batch: any;
  commitmentTxid: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function VtxoTreeSection({ batchId, batchIndex, batch, commitmentTxid, isExpanded, onToggle }: VtxoTreeSectionProps) {
  // Use the commitment transaction ID as the batch txid
  const txid = commitmentTxid;
  const vout = parseInt(batchId, 10); // batchId is the vout index

  // Fetch both tree structure and leaves
  const { data: treeData, isLoading: treeLoading, error: treeError } = useQuery({
    queryKey: ['vtxo-tree', txid, vout],
    queryFn: () => indexerClient.getVtxoTree({ txid, vout }),
    enabled: isExpanded && !!txid,
  });

  const { data: leavesData, isLoading: leavesLoading, error: leavesError } = useQuery({
    queryKey: ['vtxo-leaves', txid, vout],
    queryFn: () => indexerClient.getVtxoTreeLeaves({ txid, vout }),
    enabled: isExpanded && !!txid,
  });

  // Fetch full VTXO data using the leaf outpoints
  const leafOutpoints = leavesData?.leaves?.map((leaf: any) => ({
    txid: leaf.txid,
    vout: leaf.vout,
  })) || [];

  // Serialize outpoints for stable query key
  const outpointsKey = JSON.stringify(leafOutpoints);

  const { data: vtxosData, isLoading: vtxosLoading } = useQuery({
    queryKey: ['vtxos-by-outpoints', outpointsKey],
    queryFn: () => {
      console.log('[TreeViewer] Fetching VTXOs by outpoints:', leafOutpoints);
      console.trace('[TreeViewer] Stack trace for VTXO fetch');
      return indexerClient.getVtxos({ outpoints: leafOutpoints });
    },
    enabled: isExpanded && leafOutpoints.length > 0,
  });

  // Get unique txids from leaves to fetch virtual transactions
  const leafTxids = [...new Set(leavesData?.leaves?.map((leaf: any) => leaf.txid) || [])];

  const { data: virtualTxsData, isLoading: virtualTxsLoading } = useQuery({
    queryKey: ['virtual-txs', leafTxids],
    queryFn: async () => {
      if (leafTxids.length === 0) return { txs: [] };
      // Fetch all virtual txs at once
      const response = await indexerClient.getVirtualTxs(leafTxids as string[]);
      // Map response to include txid for matching
      const results = response.txs.map((tx: string, idx: number) => ({
        txid: leafTxids[idx],
        tx: tx
      }));
      return { txs: results };
    },
    enabled: isExpanded && leafTxids.length > 0,
  });

  const isLoading = treeLoading || leavesLoading || vtxosLoading || virtualTxsLoading;
  const error = treeError || leavesError;

  // Enrich VTXOs with script data from virtual transactions (only when data is ready)
  const enrichedVtxos = React.useMemo(() => {
    if (!vtxosData?.vtxos || !virtualTxsData?.txs) {
      return vtxosData?.vtxos || [];
    }
    
    return vtxosData.vtxos.map((vtxo: any) => {
      const virtualTx = virtualTxsData.txs.find((t: any) => t.txid === vtxo.txid);
      if (virtualTx?.tx) {
        try {
          // The tx contains the PSBT base64
          const psbtBase64 = virtualTx.tx;
          return { ...vtxo, _psbt: psbtBase64 };
        } catch (e) {
          console.error('Failed to attach PSBT:', e);
        }
      }
      return vtxo;
    });
  }, [vtxosData, virtualTxsData]);

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <h3 className="text-lg font-bold text-arkade-purple uppercase">
            VTXO Tree - Batch #{batchIndex + 1}
          </h3>
        </div>
        <div className="text-sm text-arkade-gray">
          {batch.totalOutputVtxos} VTXOs
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <p className="text-arkade-orange text-sm">Error: {(error as Error).message}</p>
          ) : (
            <>
              {/* Tree Structure */}
              {treeData?.vtxoTree && treeData.vtxoTree.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-arkade-purple uppercase mb-2">Tree Structure</h4>
                  <div className="space-y-1">
                    {(() => {
                      // Find all child txids to filter them out from root level
                      const allChildTxids = new Set<string>();
                      treeData.vtxoTree.forEach((node: any) => {
                        if (node.children) {
                          Object.values(node.children).forEach((childTxid: any) => {
                            allChildTxids.add(childTxid);
                          });
                        }
                      });
                      
                      // Only show nodes that are not children of another node (root nodes)
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

              {/* Debug if no data */}
              {!treeData?.vtxoTree?.length && !vtxosData?.vtxos?.length && (
                <div className="text-sm">
                  <p className="text-arkade-gray mb-2">Debug info:</p>
                  <pre className="text-xs text-arkade-gray bg-black p-2 overflow-auto">
                    {JSON.stringify({ txid, vout, treeData, leavesData, vtxosData }, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
