'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Layers, Leaf, TreePine } from 'lucide-react';
import { MoneyDisplay } from '@/components/shared/money-display';
import { BadgeStatus, deriveVtxoStatus } from '@/components/shared/badge-status';
import { CopyButton } from '@/components/shared/copy-button';
import { truncateHash, formatTimestamp } from '@/lib/utils';
import { indexerClient } from '@/lib/api/indexer';
import { fetchAllPages } from '@/lib/api/fetchAllPages';
import type { BatchInfo, Outpoint, Tx } from '@arkade-os/sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchEntry {
  outpoint: string; // "txid:vout" key from batches record
  info: BatchInfo;
}

interface BatchListProps {
  batches: BatchEntry[];
}

interface TreeNode {
  txid: string;
  children: Record<number, string>;
}

interface LeafVtxo {
  outpoint: Outpoint;
  amount?: string;
  isSpent?: boolean;
  isSwept?: boolean;
  isPreconfirmed?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOutpointKey(key: string): Outpoint | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;
  const txid = parts[0];
  const vout = parseInt(parts[1], 10);
  if (isNaN(vout)) return null;
  return { txid, vout };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const childEntries = Object.entries(node.children);
  const hasChildren = childEntries.length > 0;

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <TreePine className="h-3 w-3 text-muted-foreground shrink-0" />
        <Link
          href={`/tx/${node.txid}`}
          className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 truncate"
        >
          {truncateHash(node.txid, 10, 10)}
        </Link>
        <CopyButton text={node.txid} />
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            ({childEntries.length} outputs)
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-border ml-2">
          {childEntries.map(([vout, childTxid]) => (
            <div key={`${vout}-${childTxid}`} style={{ paddingLeft: '16px' }} className="flex items-center gap-2 py-1">
              <span className="text-xs text-muted-foreground">:{vout}</span>
              <Link
                href={`/tx/${childTxid}`}
                className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 truncate"
              >
                {truncateHash(childTxid, 10, 10)}
              </Link>
              <CopyButton text={childTxid} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeafVtxoRow({ leaf }: { leaf: LeafVtxo }) {
  const outpointStr = `${leaf.outpoint.txid}:${leaf.outpoint.vout}`;
  const status = deriveVtxoStatus({
    isSpent: leaf.isSpent,
    isSwept: leaf.isSwept,
    isPreconfirmed: leaf.isPreconfirmed,
  });

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors duration-150">
      <Leaf className="h-3 w-3 text-muted-foreground shrink-0" />
      <Link
        href={`/tx/${leaf.outpoint.txid}`}
        className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 truncate min-w-0"
      >
        {truncateHash(outpointStr, 12, 12)}
      </Link>
      <CopyButton text={outpointStr} />
      {leaf.amount && (
        <MoneyDisplay sats={parseInt(leaf.amount)} className="text-xs text-foreground shrink-0" />
      )}
      <BadgeStatus status={status} />
    </div>
  );
}

function BatchItem({ batch }: { batch: BatchEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [leaves, setLeaves] = useState<LeafVtxo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const outpoint = parseOutpointKey(batch.outpoint);
  const expiryDate = batch.info.expiresAt ? formatTimestamp(batch.info.expiresAt) : '--';
  const totalAmount = parseInt(batch.info.totalOutputAmount || '0');

  const handleToggle = useCallback(async () => {
    if (!expanded && !loaded && outpoint) {
      setLoading(true);
      try {
        const [treeResult, leavesResult] = await Promise.all([
          fetchAllPages(
            (opts) => indexerClient.getVtxoTree(outpoint, opts),
            'vtxoTree',
          ),
          fetchAllPages(
            (opts) => indexerClient.getVtxoTreeLeaves(outpoint, opts),
            'leaves',
          ),
        ]);

        setTree(treeResult.vtxoTree || []);
        setLeaves(
          (leavesResult.leaves || []).map((l: Outpoint) => ({
            outpoint: l,
          })),
        );
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load batch tree:', err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  }, [expanded, loaded, outpoint]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
      {/* Header (always visible) */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors duration-200"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <Layers className="h-4 w-4 text-primary shrink-0" />

        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-sm font-mono text-foreground truncate">
            {outpoint ? truncateHash(batch.outpoint, 12, 12) : batch.outpoint}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              <MoneyDisplay sats={totalAmount} className="text-xs" />
            </span>
            <span className="hidden sm:inline">&middot;</span>
            <span>{batch.info.totalOutputVtxos} VTXOs</span>
            <span className="hidden sm:inline">&middot;</span>
            <span className="hidden sm:inline">Expires {expiryDate}</span>
          </div>
        </div>

        {batch.info.swept && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0">
            swept
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Loading tree data...</span>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Batch metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Amount</span>
                  <MoneyDisplay sats={totalAmount} className="text-sm font-semibold text-foreground" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">VTXOs</span>
                  <span className="text-sm font-semibold text-foreground">{batch.info.totalOutputVtxos}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Expires</span>
                  <span className="text-sm text-foreground">{expiryDate}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Status</span>
                  <span className="text-sm text-foreground">{batch.info.swept ? 'Swept' : 'Active'}</span>
                </div>
              </div>

              {/* VTXO tree */}
              {tree.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-muted-foreground" />
                    VTXO tree ({tree.length} nodes)
                  </h4>
                  <div className="rounded-lg bg-secondary/30 border border-border p-3 max-h-80 overflow-y-auto">
                    {tree.map((node) => (
                      <TreeNodeView key={node.txid} node={node} depth={0} />
                    ))}
                  </div>
                </div>
              )}

              {/* Leaf VTXOs */}
              {leaves.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-muted-foreground" />
                    Leaf VTXOs ({leaves.length})
                  </h4>
                  <div className="rounded-lg bg-secondary/30 border border-border max-h-60 overflow-y-auto divide-y divide-border">
                    {leaves.map((leaf) => (
                      <LeafVtxoRow
                        key={`${leaf.outpoint.txid}:${leaf.outpoint.vout}`}
                        leaf={leaf}
                      />
                    ))}
                  </div>
                </div>
              )}

              {tree.length === 0 && leaves.length === 0 && loaded && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tree data available for this batch.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BatchList({ batches }: BatchListProps) {
  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
        <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No batches found in this commitment transaction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        Batches ({batches.length})
      </h2>
      <div className="space-y-3">
        {batches.map((batch) => (
          <BatchItem key={batch.outpoint} batch={batch} />
        ))}
      </div>
    </div>
  );
}
