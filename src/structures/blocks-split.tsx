'use client';

import { type ReactNode, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useStructure } from '@/hooks/use-structure';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { indexerClient } from '@/lib/api/indexer';
import { MoneyDisplay } from '@/components/shared/money-display';
import { VirtualMempool } from '@/components/shared/virtual-mempool';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import type { CommitmentTx, BatchInfo } from '@arkade-os/sdk';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlockData {
  txid: string;
  timestamp: number;
  metadata: CommitmentTx | null;
  loading: boolean;
  error: boolean;
}

interface BatchSquareData {
  outpoint: string;
  info: BatchInfo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function batchColor(amount: number, maxAmount: number): string {
  if (maxAmount === 0) return 'hsl(256, 30%, 40%)';
  const ratio = Math.min(amount / maxAmount, 1);
  const saturation = 30 + ratio * 50;
  const lightness = 55 - ratio * 15;
  return `hsl(256, ${saturation}%, ${lightness}%)`;
}

function batchSizeClass(vtxoCount: number): string {
  if (vtxoCount >= 20) return 'min-w-5 min-h-5';
  if (vtxoCount >= 10) return 'min-w-4 min-h-4';
  return 'min-w-3 min-h-3';
}

// ---------------------------------------------------------------------------
// BatchMosaic: grid of colored squares inside each block
// ---------------------------------------------------------------------------

function BatchMosaic({ batches }: { batches: BatchSquareData[] }) {
  const [hoveredBatch, setHoveredBatch] = useState<string | null>(null);

  const maxAmount = useMemo(
    () =>
      Math.max(
        ...batches.map((b) => parseInt(b.info.totalOutputAmount || '0')),
        1,
      ),
    [batches],
  );

  if (batches.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded bg-muted/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12px,1fr))] gap-0.5 p-1">
        {batches.map((batch) => {
          const amount = parseInt(batch.info.totalOutputAmount || '0');
          const color = batchColor(amount, maxAmount);
          const sizeClass = batchSizeClass(batch.info.totalOutputVtxos);
          const isHovered = hoveredBatch === batch.outpoint;

          return (
            <div
              key={batch.outpoint}
              className={`rounded-sm ${sizeClass} transition-all duration-150 cursor-default`}
              style={{
                backgroundColor: color,
                opacity: hoveredBatch && !isHovered ? 0.5 : 1,
                transform: isHovered ? 'scale(1.2)' : 'scale(1)',
              }}
              onMouseEnter={() => setHoveredBatch(batch.outpoint)}
              onMouseLeave={() => setHoveredBatch(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredBatch && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 pointer-events-none"
          >
            <div className="rounded-lg bg-popover border border-border px-3 py-2 shadow-lg text-xs whitespace-nowrap">
              {(() => {
                const batch = batches.find((b) => b.outpoint === hoveredBatch);
                if (!batch) return null;
                const amount = parseInt(batch.info.totalOutputAmount || '0');
                return (
                  <>
                    <div className="font-mono text-foreground mb-1">
                      {truncateHash(batch.outpoint, 8, 8)}
                    </div>
                    <div className="text-muted-foreground">
                      <MoneyDisplay sats={amount} className="text-xs" />{' '}
                      &middot; {batch.info.totalOutputVtxos} VTXOs
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SingleBlock: renders one commitment TX as a visual block in the timeline
// ---------------------------------------------------------------------------

function SingleBlock({
  block,
  index,
}: {
  block: BlockData;
  index: number;
}) {
  const batches: BatchSquareData[] = useMemo(() => {
    if (!block.metadata?.batches) return [];
    return Object.entries(block.metadata.batches).map(([outpoint, info]) => ({
      outpoint,
      info,
    }));
  }, [block.metadata]);

  const totalAmount = block.metadata
    ? parseInt(block.metadata.totalOutputAmount || '0')
    : 0;
  const totalVtxos = block.metadata?.totalOutputVtxos ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: index * 0.05 }}
    >
      <Link
        href={`/commitment-tx/${block.txid}`}
        className="group block w-48 h-64 rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_2px_4px_-1px_hsl(var(--primary)/0.15),0_4px_8px_hsl(var(--primary)/0.1)] hover:border-primary/30 transition-all duration-200 active:scale-[0.97] flex flex-col"
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono text-foreground truncate max-w-[100px]">
            {truncateHash(block.txid, 6, 4)}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatRelativeTime(block.timestamp)}
          </span>
        </div>

        {/* Body: mosaic grid */}
        <div className="flex-1 flex items-center justify-center p-2">
          {block.loading ? (
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : block.error ? (
            <div className="text-xs text-muted-foreground text-center px-2">
              Failed to load
            </div>
          ) : (
            <BatchMosaic batches={batches} />
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border flex items-center justify-between text-xs">
          {block.loading ? (
            <div className="animate-pulse bg-muted rounded w-full h-3" />
          ) : (
            <>
              <MoneyDisplay
                sats={totalAmount}
                className="text-xs text-foreground font-medium"
              />
              <span className="text-muted-foreground">
                {totalVtxos} VTXOs
              </span>
            </>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SettledBlocksTimeline: horizontal scrollable committed TX blocks
// ---------------------------------------------------------------------------

function SettledBlocksTimeline() {
  const { activities } = useActivityStream();
  const [blocks, setBlocks] = useState<BlockData[]>([]);

  const commitmentTxids = useMemo(() => {
    const seen = new Set<string>();
    const txids: { txid: string; timestamp: number }[] = [];
    for (const activity of activities) {
      if (
        activity.type === 'round' &&
        activity.txid &&
        !seen.has(activity.txid)
      ) {
        seen.add(activity.txid);
        txids.push({ txid: activity.txid, timestamp: activity.timestamp });
      }
    }
    return txids;
  }, [activities]);

  useEffect(() => {
    if (commitmentTxids.length === 0) return;

    setBlocks(
      commitmentTxids.map(({ txid, timestamp }) => ({
        txid,
        timestamp,
        metadata: null,
        loading: true,
        error: false,
      })),
    );

    commitmentTxids.forEach(({ txid }) => {
      indexerClient
        .getCommitmentTx(txid)
        .then((metadata) => {
          setBlocks((prev) =>
            prev.map((b) =>
              b.txid === txid ? { ...b, metadata, loading: false } : b,
            ),
          );
        })
        .catch(() => {
          setBlocks((prev) =>
            prev.map((b) =>
              b.txid === txid ? { ...b, loading: false, error: true } : b,
            ),
          );
        });
    });
  }, [commitmentTxids]);

  const showPlaceholder = blocks.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Settled commitment transactions
        </h2>
        <span className="text-xs text-muted-foreground">
          {blocks.length > 0
            ? `${blocks.length} blocks`
            : 'Waiting for activity...'}
        </span>
      </div>

      <div
        className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ scrollBehavior: 'smooth' }}
      >
        {showPlaceholder
          ? Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.25,
                  ease: EASE_OUT,
                  delay: i * 0.05,
                }}
                className="w-48 h-64 rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] flex flex-col shrink-0"
              >
                <div className="px-3 py-2.5 border-b border-border">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex-1 p-2 grid grid-cols-3 gap-1 content-center">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div
                      key={j}
                      className="h-3 w-3 rounded-sm bg-muted/50 animate-pulse"
                      style={{ animationDelay: `${j * 100}ms` }}
                    />
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-border">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                </div>
              </motion.div>
            ))
          : blocks.map((block, i) => (
              <div key={block.txid} className="shrink-0">
                <SingleBlock block={block} index={i} />
              </div>
            ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettlementDivider: visual separator between mempool and settled areas
// ---------------------------------------------------------------------------

function SettlementDivider() {
  const { activities } = useActivityStream();

  const roundCount = useMemo(
    () =>
      activities.filter(
        (a) => a.type === 'round' && a.txid,
      ).length,
    [activities],
  );

  return (
    <div className="relative flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-primary"
        >
          <path
            d="M6 1v10M6 11l-3-3M6 11l3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          {roundCount > 0
            ? `${roundCount} settled`
            : 'Settlement'}
        </span>
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlocksSplitHome: the split view home page visualization
// ---------------------------------------------------------------------------

function BlocksSplitHome() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex flex-col min-h-[calc(100vh-3.5rem)]"
    >
      {/* Top: Virtual Mempool (~40vh) */}
      <div className="min-h-[35vh] max-h-[45vh] overflow-y-auto border-b border-border bg-card/30 px-6 py-5">
        <VirtualMempool />
      </div>

      {/* Divider */}
      <div className="px-6">
        <SettlementDivider />
      </div>

      {/* Bottom: Settled blocks (~60vh) */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <SettledBlocksTimeline />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BlocksSplitLayout: wraps content, shows split view on home, centered on detail
// ---------------------------------------------------------------------------

export function BlocksSplitLayout({ children }: { children: ReactNode }) {
  const { structure } = useStructure();

  // This layout is only active for blocks-split
  if (structure !== 'blocks-split') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlocksSplitHomeView: exported for use in HomePageClient
// ---------------------------------------------------------------------------

export { BlocksSplitHome };
