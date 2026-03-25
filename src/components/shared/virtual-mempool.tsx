'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map activity type to a color palette. */
function typeColor(type: 'round' | 'vtxo' | 'transaction'): string {
  switch (type) {
    case 'transaction':
      return 'hsl(210, 60%, 55%)'; // blue-ish for ark TXs
    case 'vtxo':
      return 'hsl(150, 50%, 45%)'; // green-ish for VTXOs
    case 'round':
      return 'hsl(270, 50%, 55%)'; // purple for rounds/batches
    default:
      return 'hsl(210, 30%, 50%)';
  }
}

/** Map activity type to a muted background for hover. */
function typeBgClass(type: 'round' | 'vtxo' | 'transaction'): string {
  switch (type) {
    case 'transaction':
      return 'hover:bg-blue-500/10';
    case 'vtxo':
      return 'hover:bg-green-500/10';
    case 'round':
      return 'hover:bg-purple-500/10';
    default:
      return 'hover:bg-muted/50';
  }
}

// ---------------------------------------------------------------------------
// VirtualMempool: shared pending/unsettled visualization
// ---------------------------------------------------------------------------

export function VirtualMempool({ className }: { className?: string }) {
  const { activities } = useActivityStream();

  // Filter to non-commitment-TX items (ark TXs, VTXOs, etc.)
  const pendingItems = useMemo(() => {
    return activities.filter(
      (a) => a.type === 'transaction' || a.type === 'vtxo',
    );
  }, [activities]);

  const allItems = useMemo(() => {
    return activities;
  }, [activities]);

  // Use all items if no specifically pending ones, to show something useful
  const displayItems = pendingItems.length > 0 ? pendingItems : allItems;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">
            Virtual mempool
          </h3>
          {displayItems.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {displayItems.length}
            </span>
          )}
        </div>
        {displayItems.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      {/* Content */}
      {displayItems.length === 0 ? (
        <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            No pending virtual transactions
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {displayItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                layout
              >
                {item.txid ? (
                  <Link
                    href={`/tx/${item.txid}`}
                    className={`group relative block min-w-[44px] min-h-[44px] rounded-lg border border-border bg-card p-2 transition-all duration-200 active:scale-[0.97] ${typeBgClass(item.type)}`}
                    title={`${item.description} - ${truncateHash(item.txid, 8, 8)}`}
                  >
                    <div
                      className="w-5 h-5 rounded-sm mx-auto mb-1"
                      style={{ backgroundColor: typeColor(item.type) }}
                    />
                    <span className="block text-[9px] text-muted-foreground text-center font-mono leading-none truncate max-w-[48px]">
                      {truncateHash(item.txid, 4, 3)}
                    </span>
                  </Link>
                ) : (
                  <div
                    className="relative min-w-[44px] min-h-[44px] rounded-lg border border-border bg-card p-2"
                    title={item.description}
                  >
                    <div
                      className="w-5 h-5 rounded-sm mx-auto mb-1"
                      style={{ backgroundColor: typeColor(item.type) }}
                    />
                    <span className="block text-[9px] text-muted-foreground text-center leading-none truncate max-w-[48px]">
                      {item.type}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Legend */}
      {displayItems.length > 0 && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: typeColor('transaction') }}
            />
            <span>Ark TX</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: typeColor('vtxo') }}
            />
            <span>VTXO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: typeColor('round') }}
            />
            <span>Round</span>
          </div>
        </div>
      )}
    </div>
  );
}
