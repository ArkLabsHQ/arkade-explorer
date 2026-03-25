'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, GitBranch, Layers, Coins, Clock } from 'lucide-react';
import { useStructure } from '@/hooks/use-structure';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ListStyle } from '@/structures';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionItem {
  id: string;
  type: 'round' | 'vtxo' | 'transaction';
  txid?: string;
  description: string;
  timestamp: number;
}

interface TransactionListProps {
  transactions: TransactionItem[];
  variant?: ListStyle;
  className?: string;
}

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TypeIcon({ type }: { type: TransactionItem['type'] }) {
  switch (type) {
    case 'round':
      return <Layers className="h-3.5 w-3.5" />;
    case 'transaction':
      return <GitBranch className="h-3.5 w-3.5" />;
    case 'vtxo':
      return <Coins className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}

function typeLabel(type: TransactionItem['type']): string {
  switch (type) {
    case 'round':
      return 'Round';
    case 'transaction':
      return 'Transaction';
    case 'vtxo':
      return 'VTXO';
    default:
      return type;
  }
}

const typeBadgeClasses: Record<TransactionItem['type'], string> = {
  round: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  transaction: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  vtxo: 'bg-primary/10 text-primary',
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">
        No transactions found.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table variant
// ---------------------------------------------------------------------------

function TransactionTable({ transactions, className }: { transactions: TransactionItem[]; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                TxID
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="hover:bg-secondary/20 transition-colors duration-150"
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                      typeBadgeClasses[tx.type],
                    )}
                  >
                    <TypeIcon type={tx.type} />
                    {typeLabel(tx.type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {tx.txid ? (
                    <Link
                      href={`/tx/${tx.txid}`}
                      className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150"
                    >
                      {truncateHash(tx.txid, 8, 6)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">{tx.description}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(tx.timestamp)}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards variant
// ---------------------------------------------------------------------------

function TransactionCards({ transactions, className }: { transactions: TransactionItem[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {transactions.map((tx, i) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.03 * i }}
          className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] hover:bg-secondary/20 transition-colors duration-200"
        >
          {/* Header: type badge + time */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                typeBadgeClasses[tx.type],
              )}
            >
              <TypeIcon type={tx.type} />
              {typeLabel(tx.type)}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(tx.timestamp)}</span>
            </div>
          </div>

          {/* TxID */}
          {tx.txid ? (
            <Link
              href={`/tx/${tx.txid}`}
              className="block font-mono text-xs text-foreground hover:text-primary transition-colors duration-150 truncate mb-2"
            >
              {truncateHash(tx.txid, 10, 8)}
            </Link>
          ) : (
            <span className="block text-xs text-muted-foreground mb-2">--</span>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dense-rows variant
// ---------------------------------------------------------------------------

function TransactionDenseRows({ transactions, className }: { transactions: TransactionItem[]; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]', className)}>
      {transactions.map((tx, index) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: EASE_OUT }}
          className={cn(
            'flex items-center gap-3 py-1.5 px-3 transition-colors duration-150',
            index % 2 === 0 && 'bg-secondary/30',
            'hover:bg-secondary/50',
          )}
        >
          {/* Type icon */}
          <span className={cn('shrink-0', typeBadgeClasses[tx.type])}>
            <TypeIcon type={tx.type} />
          </span>

          {/* TxID */}
          {tx.txid ? (
            <Link
              href={`/tx/${tx.txid}`}
              className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150 truncate min-w-0 shrink"
            >
              {truncateHash(tx.txid, 6, 4)}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">--</span>
          )}

          {/* Description */}
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {tx.description}
          </span>

          {/* Time */}
          <span className="text-xs text-muted-foreground shrink-0">
            {formatRelativeTime(tx.timestamp)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (variant-aware)
// ---------------------------------------------------------------------------

export function TransactionList({ transactions, variant: overrideVariant, className }: TransactionListProps) {
  const { preferences } = useStructure();
  const variant = overrideVariant ?? preferences.listStyle;

  if (transactions.length === 0) {
    return <EmptyState />;
  }

  switch (variant) {
    case 'table':
      return <TransactionTable transactions={transactions} className={className} />;
    case 'cards':
      return <TransactionCards transactions={transactions} className={className} />;
    case 'dense-rows':
      return <TransactionDenseRows transactions={transactions} className={className} />;
    default:
      return <TransactionTable transactions={transactions} className={className} />;
  }
}
