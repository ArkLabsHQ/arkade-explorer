'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { indexerClient } from '@/lib/api/indexer';
import { fetchAllPages } from '@/lib/api/fetchAllPages';
import { truncateHash } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Tx, Outpoint, Vtxo } from '@arkade-os/sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VtxoTreeVizProps {
  commitmentTxid: string;
  batchVout: number;
}

interface TreeNodeData {
  txid: string;
  children: Record<number, string>;
}

interface LeafData {
  outpoint: Outpoint;
  vtxo?: Vtxo;
}

type NodeStatus = 'internal' | 'spendable' | 'spent' | 'preconfirmed' | 'swept';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

const STATUS_BORDER: Record<NodeStatus, string> = {
  internal: 'border-border',
  spendable: 'border-emerald-500',
  spent: 'border-red-500',
  preconfirmed: 'border-orange-500',
  swept: 'border-zinc-500',
};

const STATUS_BG: Record<NodeStatus, string> = {
  internal: 'bg-card',
  spendable: 'bg-emerald-500/10',
  spent: 'bg-red-500/10',
  preconfirmed: 'bg-orange-500/10',
  swept: 'bg-zinc-500/10',
};

const STATUS_LABELS: Record<NodeStatus, string> = {
  internal: 'Node',
  spendable: 'Spendable',
  spent: 'Spent',
  preconfirmed: 'Preconfirmed',
  swept: 'Swept',
};

// ---------------------------------------------------------------------------
// Helper: build a tree structure from flat node list
// ---------------------------------------------------------------------------

interface BuiltTree {
  txid: string;
  childNodes: BuiltTree[];
  isLeaf: boolean;
  leafData?: LeafData;
}

function buildTree(
  nodes: TreeNodeData[],
  leaves: LeafData[],
): BuiltTree[] {
  const nodeMap = new Map<string, TreeNodeData>();
  const leafSet = new Set<string>();

  for (const node of nodes) {
    nodeMap.set(node.txid, node);
  }

  for (const leaf of leaves) {
    leafSet.add(leaf.outpoint.txid);
  }

  // Find the set of child txids
  const childTxids = new Set<string>();
  for (const node of nodes) {
    for (const childTxid of Object.values(node.children)) {
      childTxids.add(childTxid);
    }
  }

  // Root nodes are nodes that are not children of any other node
  const rootTxids = nodes
    .filter((n) => !childTxids.has(n.txid))
    .map((n) => n.txid);

  function buildNode(txid: string): BuiltTree {
    const node = nodeMap.get(txid);
    const isLeaf = !node || Object.keys(node.children).length === 0;
    const leafData = leaves.find((l) => l.outpoint.txid === txid);

    if (!node) {
      return {
        txid,
        childNodes: [],
        isLeaf: true,
        leafData,
      };
    }

    const childNodes = Object.values(node.children)
      .filter((childTxid) => childTxid !== txid) // avoid self-references
      .map((childTxid) => buildNode(childTxid));

    return {
      txid,
      childNodes,
      isLeaf: isLeaf && childNodes.length === 0,
      leafData,
    };
  }

  // If no clear roots, use first node as root
  if (rootTxids.length === 0 && nodes.length > 0) {
    return [buildNode(nodes[0].txid)];
  }

  return rootTxids.map(buildNode);
}

// ---------------------------------------------------------------------------
// TreeNodeCard: a single node in the visualization
// ---------------------------------------------------------------------------

function TreeNodeCard({
  node,
  depth,
  onToggle,
  expandedNodes,
}: {
  node: BuiltTree;
  depth: number;
  onToggle: (txid: string) => void;
  expandedNodes: Set<string>;
}) {
  const isExpanded = expandedNodes.has(node.txid);
  const hasChildren = node.childNodes.length > 0;
  const childCount = node.childNodes.length;

  // Determine status
  let status: NodeStatus = 'internal';
  if (node.isLeaf && node.leafData?.vtxo) {
    const vtxo = node.leafData.vtxo;
    if (vtxo.isSwept) status = 'swept';
    else if (vtxo.isSpent) status = 'spent';
    else if (vtxo.isPreconfirmed) status = 'preconfirmed';
    else status = 'spendable';
  } else if (node.isLeaf) {
    // Leaf without extra vtxo data — show as spendable by default
    status = 'spendable';
  }

  return (
    <div className="flex flex-col items-center">
      {/* This node */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: EASE_OUT, delay: depth * 0.03 }}
        className={cn(
          'relative rounded-lg border-2 px-3 py-2 min-w-[140px] max-w-[200px] cursor-pointer transition-all duration-200',
          STATUS_BORDER[status],
          STATUS_BG[status],
          'shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]',
          hasChildren && 'hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_2px_4px_-1px_hsl(var(--primary)/0.15),0_4px_8px_hsl(var(--primary)/0.1)]',
        )}
        onClick={() => {
          if (hasChildren) {
            onToggle(node.txid);
          }
        }}
      >
        {/* Txid */}
        <div className="flex items-center gap-1.5">
          {hasChildren && (
            <span className="text-muted-foreground text-xs shrink-0">
              {isExpanded ? '\u25BC' : '\u25B6'}
            </span>
          )}
          {node.isLeaf ? (
            <Link
              href={`/tx/${node.txid}`}
              className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {truncateHash(node.txid, 8, 6)}
            </Link>
          ) : (
            <span className="text-xs font-mono text-foreground truncate">
              {truncateHash(node.txid, 8, 6)}
            </span>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-1">
          {hasChildren && (
            <span className="text-[10px] text-muted-foreground">
              {childCount} children
            </span>
          )}
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              status === 'spendable' && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
              status === 'spent' && 'bg-red-500/20 text-red-600 dark:text-red-400',
              status === 'preconfirmed' && 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
              status === 'swept' && 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400',
              status === 'internal' && 'bg-muted text-muted-foreground',
            )}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      </motion.div>

      {/* Connecting line + children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="flex flex-col items-center overflow-hidden"
          >
            {/* Vertical connector from parent to children */}
            <div className="w-px h-6 bg-border" />

            {/* Horizontal rail + child branches */}
            <div className="relative flex items-start gap-6">
              {/* Horizontal rail connecting children */}
              {node.childNodes.length > 1 && (
                <div className="absolute top-0 left-[50%] -translate-x-[50%] h-px bg-border"
                  style={{
                    width: `calc(100% - 140px)`,
                    maxWidth: `${(node.childNodes.length - 1) * 170}px`,
                  }}
                />
              )}

              {node.childNodes.map((child) => (
                <div key={child.txid} className="flex flex-col items-center">
                  {/* Vertical connector from rail to child */}
                  <div className="w-px h-4 bg-border" />
                  <TreeNodeCard
                    node={child}
                    depth={depth + 1}
                    onToggle={onToggle}
                    expandedNodes={expandedNodes}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function TreeLegend() {
  const items: { status: NodeStatus; label: string }[] = [
    { status: 'internal', label: 'Internal node' },
    { status: 'spendable', label: 'Spendable' },
    { status: 'spent', label: 'Spent' },
    { status: 'preconfirmed', label: 'Preconfirmed' },
    { status: 'swept', label: 'Swept' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {items.map(({ status, label }) => (
        <div key={status} className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-3 h-3 rounded-sm border-2',
              STATUS_BORDER[status],
              STATUS_BG[status],
            )}
          />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VtxoTreeViz: main component
// ---------------------------------------------------------------------------

export function VtxoTreeViz({ commitmentTxid, batchVout }: VtxoTreeVizProps) {
  const [treeNodes, setTreeNodes] = useState<TreeNodeData[]>([]);
  const [leaves, setLeaves] = useState<LeafData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const outpoint: Outpoint = useMemo(
    () => ({ txid: commitmentTxid, vout: batchVout }),
    [commitmentTxid, batchVout],
  );

  // Fetch tree data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchAllPages(
        (opts) => indexerClient.getVtxoTree(outpoint, opts),
        'vtxoTree',
      ),
      fetchAllPages(
        (opts) => indexerClient.getVtxoTreeLeaves(outpoint, opts),
        'leaves',
      ),
    ])
      .then(([treeResult, leavesResult]) => {
        if (cancelled) return;
        setTreeNodes(treeResult.vtxoTree || []);
        setLeaves(
          (leavesResult.leaves || []).map((l: Outpoint) => ({
            outpoint: l,
          })),
        );
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load tree');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [outpoint]);

  // Build tree structure
  const builtTree = useMemo(
    () => buildTree(treeNodes, leaves),
    [treeNodes, leaves],
  );

  // Auto-expand first level
  useEffect(() => {
    if (builtTree.length > 0) {
      setExpandedNodes(new Set(builtTree.map((n) => n.txid)));
    }
  }, [builtTree]);

  const handleToggle = useCallback((txid: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(txid)) {
        next.delete(txid);
      } else {
        next.add(txid);
      }
      return next;
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">
            Loading VTXO tree...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
            Failed to load VTXO tree
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (builtTree.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
        <p className="text-sm text-muted-foreground">
          No tree data available for this batch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-foreground">
          VTXO tree
        </h3>
        <TreeLegend />
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 overflow-x-auto shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
        <div className="flex flex-col items-center gap-2 min-w-fit">
          {builtTree.map((root) => (
            <TreeNodeCard
              key={root.txid}
              node={root}
              depth={0}
              onToggle={handleToggle}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {treeNodes.length} nodes &middot; {leaves.length} leaves
      </div>
    </div>
  );
}
