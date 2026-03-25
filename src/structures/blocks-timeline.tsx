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

// ---------------------------------------------------------------------------
// PendingIndicator: pulsing dot with "Pending settlement..." label
// ---------------------------------------------------------------------------

function PendingIndicator() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative flex items-center justify-center w-4 h-4">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
      </div>
      <span className="text-sm text-muted-foreground font-medium">
        Pending settlement...
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineMilestone: a single settled commitment TX in the timeline
// ---------------------------------------------------------------------------

function TimelineMilestone({
  block,
  index,
  isLast,
}: {
  block: BlockData;
  index: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const batchEntries = useMemo(() => {
    if (!block.metadata?.batches) return [];
    return Object.entries(block.metadata.batches);
  }, [block.metadata]);

  const batchCount = batchEntries.length;
  const totalAmount = block.metadata
    ? parseInt(block.metadata.totalOutputAmount || '0')
    : 0;
  const totalVtxos = block.metadata?.totalOutputVtxos ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: index * 0.06 }}
      className="relative"
    >
      <div className="flex gap-4">
        {/* Left: timestamp column */}
        <div className="w-20 shrink-0 text-right pt-4">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(block.timestamp)}
          </span>
        </div>

        {/* Center: timeline line + dot */}
        <div className="relative flex flex-col items-center shrink-0">
          {/* Milestone dot */}
          <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-[0_0_0_2px_hsl(var(--primary)/0.2)] mt-4" />
          {/* Connecting line */}
          {!isLast && (
            <div className="w-0.5 flex-1 bg-primary/20 min-h-[24px]" />
          )}
        </div>

        {/* Right: block card */}
        <div className="flex-1 pb-6 min-w-0">
          {block.loading ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
              <div className="space-y-2">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ) : block.error ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
              <p className="text-sm text-muted-foreground">Failed to load</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {truncateHash(block.txid, 12, 12)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_2px_4px_-1px_hsl(var(--primary)/0.15),0_4px_8px_hsl(var(--primary)/0.1)] hover:border-primary/30 transition-all duration-200">
              {/* Card header: clickable to expand */}
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="w-full text-left px-4 py-3.5 min-h-[44px] hover:bg-secondary/30 transition-colors duration-150 active:scale-[0.99]"
                aria-expanded={expanded}
                aria-label={`Commitment TX ${truncateHash(block.txid, 8, 6)} with ${batchCount} batches`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-primary truncate">
                        {truncateHash(block.txid, 10, 8)}
                      </span>
                      <motion.svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="text-muted-foreground shrink-0"
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                      >
                        <path
                          d="M3 4.5l3 3 3-3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {batchCount} batch{batchCount !== 1 ? 'es' : ''}
                      </span>
                      <span>{totalVtxos} VTXOs</span>
                      <MoneyDisplay
                        sats={totalAmount}
                        className="text-xs text-foreground font-medium"
                      />
                    </div>
                  </div>

                  {/* Link to full detail page */}
                  <Link
                    href={`/commitment-tx/${block.txid}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150"
                    aria-label={`View full details for ${truncateHash(block.txid, 6, 4)}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M6 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              </button>

              {/* Expanded batch list */}
              <AnimatePresence>
                {expanded && batchEntries.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border">
                      {batchEntries.map(
                        ([outpoint, info]: [string, BatchInfo], batchIndex: number) => {
                          const amount = parseInt(
                            info.totalOutputAmount || '0',
                          );
                          return (
                            <motion.div
                              key={outpoint}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.15,
                                ease: EASE_OUT,
                                delay: batchIndex * 0.03,
                              }}
                            >
                              <Link
                                href={`/commitment-tx/${block.txid}`}
                                className="flex items-center justify-between px-4 py-2.5 min-h-[44px] hover:bg-secondary/30 transition-colors duration-150 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                                    style={{
                                      backgroundColor: `hsl(256, ${30 + (amount / (totalAmount || 1)) * 50}%, ${55 - (amount / (totalAmount || 1)) * 15}%)`,
                                    }}
                                  />
                                  <span className="font-mono text-foreground truncate">
                                    {truncateHash(outpoint, 8, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                                  <span>{info.totalOutputVtxos} VTXOs</span>
                                  <MoneyDisplay
                                    sats={amount}
                                    className="text-xs text-foreground"
                                  />
                                </div>
                              </Link>
                            </motion.div>
                          );
                        },
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BlocksTimelineHome: the vertical timeline home page visualization
// ---------------------------------------------------------------------------

function BlocksTimelineHome() {
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

  const hasPending = useMemo(
    () =>
      activities.some((a) => a.type === 'transaction' || a.type === 'vtxo'),
    [activities],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="max-w-3xl mx-auto px-4 py-6"
    >
      {/* Leading edge: unsettled area */}
      <div className="mb-6">
        <PendingIndicator />
        <div className="ml-7 pl-4 border-l-2 border-primary/20">
          <VirtualMempool />
        </div>
      </div>

      {/* Settled timeline */}
      <div className="space-y-0">
        <div className="flex items-center gap-2 mb-4 ml-[5.5rem]">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Settled
          </h2>
          <span className="text-xs text-muted-foreground">
            {blocks.length > 0
              ? `${blocks.length} commitment TX${blocks.length !== 1 ? 's' : ''}`
              : 'Waiting for activity...'}
          </span>
        </div>

        {blocks.length === 0 ? (
          /* Placeholder milestones */
          <div className="space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-20 shrink-0 text-right pt-4">
                  <div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" />
                </div>
                <div className="relative flex flex-col items-center shrink-0">
                  <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-muted border-2 border-background mt-4" />
                  {i < 2 && (
                    <div className="w-0.5 flex-1 bg-muted/50 min-h-[24px]" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          blocks.map((block, i) => (
            <TimelineMilestone
              key={block.txid}
              block={block}
              index={i}
              isLast={i === blocks.length - 1}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BlocksTimelineLayout: layout wrapper
// ---------------------------------------------------------------------------

export function BlocksTimelineLayout({ children }: { children: ReactNode }) {
  const { structure } = useStructure();

  if (structure !== 'blocks-timeline') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BlocksTimelineHome };
