'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { indexerClient } from '@/lib/api/indexer';
import { MoneyDisplay } from '@/components/shared/money-display';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import type { CommitmentTx } from '@arkade-os/sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommitmentBlockData {
  txid: string;
  timestamp: number;
  metadata: CommitmentTx | null;
  loading: boolean;
  error: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// BatchSizeBar: a small visual indicator of batch sizes
// ---------------------------------------------------------------------------

function BatchSizeBar({ batches }: { batches: Record<string, { totalOutputAmount: string; totalOutputVtxos: number }> }) {
  const entries = Object.entries(batches);
  if (entries.length === 0) return null;

  const maxAmount = Math.max(
    ...entries.map(([, b]) => parseInt(b.totalOutputAmount || '0')),
    1,
  );

  return (
    <div className="flex items-end gap-0.5 h-4">
      {entries.slice(0, 12).map(([key, batch]) => {
        const amount = parseInt(batch.totalOutputAmount || '0');
        const ratio = Math.max(amount / maxAmount, 0.15);
        const height = Math.round(ratio * 16);
        const saturation = 30 + ratio * 50;
        const lightness = 55 - ratio * 15;

        return (
          <div
            key={key}
            className="w-1.5 rounded-t-sm transition-all duration-200"
            style={{
              height: `${height}px`,
              backgroundColor: `hsl(256, ${saturation}%, ${lightness}%)`,
            }}
          />
        );
      })}
      {entries.length > 12 && (
        <span className="text-[8px] text-muted-foreground ml-0.5">
          +{entries.length - 12}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommitmentBlockCard: a single commitment TX card
// ---------------------------------------------------------------------------

function CommitmentBlockCard({
  block,
  index,
}: {
  block: CommitmentBlockData;
  index: number;
}) {
  const batchCount = block.metadata
    ? Object.keys(block.metadata.batches).length
    : 0;
  const totalAmount = block.metadata
    ? parseInt(block.metadata.totalOutputAmount || '0')
    : 0;
  const totalVtxos = block.metadata?.totalOutputVtxos ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: index * 0.05 }}
    >
      <Link
        href={`/commitment-tx/${block.txid}`}
        className="group block rounded-xl border border-border bg-card p-5 hover:bg-secondary/40 transition-all duration-200 active:scale-[0.98] shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_2px_4px_-1px_hsl(var(--primary)/0.15),0_4px_8px_hsl(var(--primary)/0.1)] hover:border-primary/30"
      >
        {block.loading ? (
          // Loading skeleton
          <div className="space-y-3">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="flex gap-4 mt-4">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : block.error ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Failed to load</p>
            <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
              {truncateHash(block.txid, 12, 12)}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Txid */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-primary group-hover:text-primary/80 transition-colors duration-200 truncate">
                {truncateHash(block.txid, 10, 8)}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {formatRelativeTime(block.timestamp)}
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Batches</span>
                <span className="font-medium text-foreground">{batchCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">VTXOs</span>
                <span className="font-medium text-foreground">{totalVtxos}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Value</span>
                <MoneyDisplay sats={totalAmount} className="font-medium text-foreground text-xs" />
              </div>
            </div>

            {/* Batch size visualization */}
            {block.metadata && (
              <div className="pt-1 border-t border-border">
                <BatchSizeBar batches={block.metadata.batches} />
              </div>
            )}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CommitmentBlocks: grid view of recent commitment TXs
// ---------------------------------------------------------------------------

export function CommitmentBlocks() {
  const { activities } = useActivityStream();
  const [blocks, setBlocks] = useState<CommitmentBlockData[]>([]);

  // Extract commitment TX txids from the activity stream
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
              b.txid === txid
                ? { ...b, metadata, loading: false }
                : b,
            ),
          );
        })
        .catch(() => {
          setBlocks((prev) =>
            prev.map((b) =>
              b.txid === txid
                ? { ...b, loading: false, error: true }
                : b,
            ),
          );
        });
    });
  }, [commitmentTxids]);

  // Show placeholder cards if no data
  const showPlaceholder = blocks.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Recent commitment transactions
        </h2>
        <span className="text-sm text-muted-foreground">
          {blocks.length > 0
            ? `${blocks.length} transactions`
            : 'Waiting for activity...'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showPlaceholder
          ? Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT, delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]"
              >
                <div className="space-y-3">
                  <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="h-8 bg-muted rounded animate-pulse" />
                    <div className="h-8 bg-muted rounded animate-pulse" />
                    <div className="h-8 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-end gap-0.5 h-4">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div
                          key={j}
                          className="w-1.5 bg-muted rounded-t-sm animate-pulse"
                          style={{
                            height: `${8 + Math.random() * 8}px`,
                            animationDelay: `${j * 150}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          : blocks.map((block, i) => (
              <CommitmentBlockCard key={block.txid} block={block} index={i} />
            ))}
      </div>
    </div>
  );
}
