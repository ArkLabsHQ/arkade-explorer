'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { indexerClient } from '@/lib/api/indexer';
import { MoneyDisplay } from '@/components/shared/money-display';
import { truncateHash, cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import { Layers, Clock, Coins } from 'lucide-react';
import type { CommitmentTx } from '@arkade-os/sdk';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreemapNode {
  txid: string;
  timestamp: number;
  value: number;
  batchCount: number;
  vtxoCount: number;
  metadata: CommitmentTx | null;
  loading: boolean;
  error: boolean;
  batches: TreemapBatch[];
}

interface TreemapBatch {
  id: string;
  value: number;
  vtxoCount: number;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function TreemapTooltip({
  node,
  position,
}: {
  node: TreemapNode;
  position: { x: number; y: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: EASE_OUT }}
      className="fixed z-50 pointer-events-none"
      style={{
        left: Math.min(position.x + 12, window.innerWidth - 260),
        top: Math.min(position.y - 8, window.innerHeight - 180),
      }}
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_4px_12px_hsl(var(--border)/0.3)] max-w-[240px]">
        <p className="text-xs font-mono text-primary mb-2 truncate">
          {truncateHash(node.txid, 10, 8)}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Value</span>
            <MoneyDisplay sats={node.value} className="text-xs font-semibold text-foreground" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Batches</span>
            <span className="text-xs font-medium text-foreground">{node.batchCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">VTXOs</span>
            <span className="text-xs font-medium text-foreground">{node.vtxoCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Age</span>
            <span className="text-xs text-foreground">{formatRelativeTime(node.timestamp)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Treemap rectangle
// ---------------------------------------------------------------------------

function TreemapRect({
  node,
  index,
  total,
  onHover,
  onLeave,
}: {
  node: TreemapNode;
  index: number;
  total: number;
  onHover: (node: TreemapNode, e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const router = useRouter();

  // Age-based color: newer = more vibrant, older = more muted
  const age = Date.now() - node.timestamp;
  const maxAge = 30 * 60 * 1000; // 30 minutes
  const ageRatio = Math.min(age / maxAge, 1);
  const vibrancy = 1 - ageRatio; // 1 = newest, 0 = oldest

  // Interpolate from muted to vibrant purple
  const saturation = 20 + vibrancy * 50; // 20% to 70%
  const lightness = 25 + vibrancy * 20; // 25% to 45%
  const opacity = 0.5 + vibrancy * 0.5; // 0.5 to 1.0

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: index * 0.04 }}
      onClick={() => router.push(`/commitment-tx/${node.txid}`)}
      onMouseEnter={(e) => onHover(node, e)}
      onMouseMove={(e) => onHover(node, e)}
      onMouseLeave={onLeave}
      className={cn(
        'relative rounded-lg border border-white/5 transition-all duration-200 overflow-hidden',
        'hover:border-primary/40 hover:z-10 active:scale-[0.97]',
        'focus:outline-none focus:ring-2 focus:ring-primary/40',
        'motion-reduce:animate-none'
      )}
      style={{
        backgroundColor: `hsl(270, ${saturation}%, ${lightness}%)`,
        opacity,
      }}
    >
      {/* Inner batch rectangles */}
      {node.batches.length > 0 && (
        <div className="absolute inset-1 flex flex-wrap gap-0.5 opacity-30">
          {node.batches.slice(0, 8).map((batch) => {
            const batchRatio = node.value > 0 ? batch.value / node.value : 0;
            const batchSize = Math.max(batchRatio * 100, 10);
            return (
              <div
                key={batch.id}
                className="rounded-sm bg-white/20"
                style={{
                  width: `${Math.min(batchSize, 45)}%`,
                  height: `${Math.min(batchSize * 0.6, 40)}%`,
                  minWidth: '12px',
                  minHeight: '8px',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Label overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white/80">
        <p className="text-[10px] font-mono truncate max-w-full">
          {truncateHash(node.txid, 4, 4)}
        </p>
        {node.value > 0 && (
          <p className="text-[9px] opacity-70 mt-0.5">
            {node.batchCount}b / {node.vtxoCount}v
          </p>
        )}
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Treemap layout algorithm (simple squarified)
// ---------------------------------------------------------------------------

function computeGridLayout(nodes: TreemapNode[], containerWidth: number): { cols: number; rows: number } {
  const count = nodes.length;
  if (count === 0) return { cols: 1, rows: 1 };
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

// ---------------------------------------------------------------------------
// TreemapView: main component
// ---------------------------------------------------------------------------

export function TreemapView() {
  const { activities } = useActivityStream();
  const [nodes, setNodes] = useState<TreemapNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Extract commitment TX txids from activity
  const commitmentTxids = useMemo(() => {
    const seen = new Set<string>();
    const txids: { txid: string; timestamp: number }[] = [];
    for (const activity of activities) {
      if (activity.type === 'round' && activity.txid && !seen.has(activity.txid)) {
        seen.add(activity.txid);
        txids.push({ txid: activity.txid, timestamp: activity.timestamp });
      }
    }
    return txids;
  }, [activities]);

  // Fetch metadata for each commitment TX
  useEffect(() => {
    if (commitmentTxids.length === 0) return;

    setNodes(
      commitmentTxids.map(({ txid, timestamp }) => ({
        txid,
        timestamp,
        value: 0,
        batchCount: 0,
        vtxoCount: 0,
        metadata: null,
        loading: true,
        error: false,
        batches: [],
      }))
    );

    commitmentTxids.forEach(({ txid }) => {
      indexerClient
        .getCommitmentTx(txid)
        .then((metadata) => {
          const totalValue = parseInt(metadata.totalOutputAmount || '0');
          const batchCount = Object.keys(metadata.batches || {}).length;
          const vtxoCount = metadata.totalOutputVtxos ?? 0;

          const batches: TreemapBatch[] = Object.entries(metadata.batches || {}).map(
            ([key, batch]) => ({
              id: key,
              value: parseInt((batch as any).totalOutputAmount || '0'),
              vtxoCount: (batch as any).totalOutputVtxos ?? 0,
            })
          );

          setNodes((prev) =>
            prev.map((n) =>
              n.txid === txid
                ? {
                    ...n,
                    metadata,
                    value: totalValue,
                    batchCount,
                    vtxoCount,
                    loading: false,
                    batches,
                  }
                : n
            )
          );
        })
        .catch(() => {
          setNodes((prev) =>
            prev.map((n) =>
              n.txid === txid ? { ...n, loading: false, error: true } : n
            )
          );
        });
    });
  }, [commitmentTxids]);

  // Sort by value for the treemap (largest first)
  const sortedNodes = useMemo(
    () => [...nodes].filter((n) => !n.loading && !n.error).sort((a, b) => b.value - a.value),
    [nodes]
  );

  const layout = computeGridLayout(sortedNodes, 0);

  // Compute fr values for grid template
  const totalValue = sortedNodes.reduce((sum, n) => sum + Math.max(n.value, 1), 0);

  const handleHover = useCallback((node: TreemapNode, e: React.MouseEvent) => {
    setHoveredNode(node);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const hasData = sortedNodes.length > 0;
  const isLoading = nodes.some((n) => n.loading);

  return (
    <div className="space-y-6">
      {/* Treemap grid */}
      <div className="min-h-[calc(100vh-16rem)]">
        {hasData ? (
          <div
            className="grid gap-2 h-[calc(100vh-16rem)]"
            style={{
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            }}
          >
            {sortedNodes.map((node, i) => (
              <TreemapRect
                key={node.txid}
                node={node}
                index={i}
                total={sortedNodes.length}
                onHover={handleHover}
                onLeave={handleLeave}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-2 gap-2 h-[calc(100vh-16rem)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.06 }}
                className="rounded-lg bg-secondary/50 border border-border animate-pulse flex items-center justify-center"
              >
                <div className="text-center">
                  <Layers className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">
                    {isLoading ? 'Loading...' : 'Waiting for data'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: 'hsl(270, 70%, 45%)' }} />
            <span>Newer</span>
          </div>
          <div className="w-8 h-0.5 bg-gradient-to-r from-[hsl(270,70%,45%)] to-[hsl(270,20%,25%)] rounded" />
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: 'hsl(270, 20%, 25%)' }} />
            <span>Older</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="h-3 w-3" />
          <span>Rectangle size = total value</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          <span>Inner rectangles = batches</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <TreemapTooltip node={hoveredNode} position={tooltipPos} />
        )}
      </AnimatePresence>
    </div>
  );
}
