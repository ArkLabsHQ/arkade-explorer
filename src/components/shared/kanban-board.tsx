'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { MoneyDisplay } from '@/components/shared/money-display';
import { truncateHash, cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import { Clock, Coins, ArrowRight, CheckCircle2, Send, Undo2 } from 'lucide-react';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VtxoCard {
  id: string;
  txid: string;
  outpoint: string;
  amount: number;
  timestamp: number;
  state: 'preconfirmed' | 'settled' | 'spent' | 'swept';
}

interface KanbanColumn {
  id: 'preconfirmed' | 'settled' | 'spent' | 'swept';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'preconfirmed',
    label: 'Preconfirmed',
    description: 'VTXOs waiting for on-chain settlement',
    icon: Clock,
    color: 'text-amber-400',
    borderColor: 'border-l-amber-400',
  },
  {
    id: 'settled',
    label: 'Settled',
    description: 'Confirmed and settled on-chain',
    icon: CheckCircle2,
    color: 'text-green-400',
    borderColor: 'border-l-green-400',
  },
  {
    id: 'spent',
    label: 'Spent',
    description: 'Spent in Arkade transactions',
    icon: Send,
    color: 'text-blue-400',
    borderColor: 'border-l-blue-400',
  },
  {
    id: 'swept',
    label: 'Swept',
    description: 'Reclaimed/swept by the service provider',
    icon: Undo2,
    color: 'text-purple-400',
    borderColor: 'border-l-purple-400',
  },
];

// ---------------------------------------------------------------------------
// VtxoCard component
// ---------------------------------------------------------------------------

function VtxoCardItem({
  card,
  column,
  index,
}: {
  card: VtxoCard;
  column: KanbanColumn;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT, delay: index * 0.03 }}
      className="motion-reduce:animate-none"
    >
      <Link
        href={`/tx/${card.txid}`}
        className={cn(
          'group block rounded-lg border border-border bg-card p-3.5 transition-all duration-200',
          'hover:shadow-[0_0_0_1px_hsl(var(--border)),0_2px_4px_-1px_hsl(var(--border)/0.3),0_4px_8px_hsl(var(--border)/0.2)]',
          'hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0',
          'shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]',
          `border-l-2 ${column.borderColor}`,
          'motion-reduce:hover:translate-y-0'
        )}
      >
        {/* Outpoint */}
        <p className="text-xs font-mono text-primary group-hover:text-primary/80 transition-colors duration-200 truncate mb-2">
          {card.outpoint}
        </p>

        {/* Amount */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <MoneyDisplay
            sats={card.amount}
            className="text-sm font-semibold text-foreground"
          />
          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>

        {/* Age */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(card.timestamp)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Column component
// ---------------------------------------------------------------------------

function KanbanColumnView({ column, cards }: { column: KanbanColumn; cards: VtxoCard[] }) {
  const Icon = column.icon;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] w-full shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 mb-3">
        <Icon className={cn('h-4 w-4', column.color)} />
        <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
        <span className="ml-auto inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
          {cards.length}
        </span>
      </div>

      {/* Column body */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-1 pb-4 max-h-[calc(100vh-14rem)]">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border border-dashed border-border bg-secondary/30">
            <Icon className={cn('h-6 w-6 mb-2', column.color, 'opacity-40')} />
            <p className="text-xs text-muted-foreground text-center">
              {column.description}
            </p>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
              No VTXOs in this state
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cards.map((card, i) => (
              <VtxoCardItem
                key={card.id}
                card={card}
                column={column}
                index={i}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanBoard: main component
// ---------------------------------------------------------------------------

export function KanbanBoard() {
  const { activities } = useActivityStream();

  // Derive VTXO cards from activity stream
  const vtxoCards = useMemo<VtxoCard[]>(() => {
    const cards: VtxoCard[] = [];
    const seen = new Set<string>();

    for (const activity of activities) {
      if (!activity.txid || seen.has(activity.txid)) continue;
      seen.add(activity.txid);

      // Determine state based on activity type and description
      let state: VtxoCard['state'] = 'preconfirmed';
      if (activity.type === 'vtxo') {
        if (activity.description.toLowerCase().includes('spent')) {
          state = 'spent';
        } else {
          state = 'preconfirmed';
        }
      } else if (activity.type === 'round') {
        state = 'settled';
      } else if (activity.type === 'transaction') {
        // Ark TXs create both spent and new VTXOs
        state = 'preconfirmed';
      }

      // Create a synthetic card per activity
      const amount = Math.floor(Math.random() * 500000) + 10000; // Placeholder amount from mock
      cards.push({
        id: activity.id,
        txid: activity.txid,
        outpoint: `${truncateHash(activity.txid, 8, 4)}:0`,
        amount,
        timestamp: activity.timestamp,
        state,
      });
    }

    return cards;
  }, [activities]);

  // Group cards by column
  const groupedCards = useMemo(() => {
    const groups: Record<string, VtxoCard[]> = {
      preconfirmed: [],
      settled: [],
      spent: [],
      swept: [],
    };

    for (const card of vtxoCards) {
      if (groups[card.state]) {
        groups[card.state].push(card);
      }
    }

    return groups;
  }, [vtxoCards]);

  // If no data, show some placeholder skeleton cards
  const hasData = vtxoCards.length > 0;

  return (
    <div className="space-y-6">
      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {COLUMNS.map((column) => (
          <KanbanColumnView
            key={column.id}
            column={column}
            cards={groupedCards[column.id] || []}
          />
        ))}
      </div>

      {/* Empty state overlay */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.3 }}
          className="text-center py-4"
        >
          <p className="text-sm text-muted-foreground">
            Waiting for VTXO activity. VTXOs will populate the board in real time.
          </p>
        </motion.div>
      )}
    </div>
  );
}
