'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Clock } from 'lucide-react';
import type { VirtualCoin } from '@arkade-os/sdk';
import { MoneyDisplay } from '@/components/shared/money-display';
import { CopyButton } from '@/components/shared/copy-button';
import { truncateHash, copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useStructure } from '@/hooks/use-structure';
import type { ListStyle } from '@/structures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVtxoStatus(vtxo: VirtualCoin): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'muted';
} {
  if (vtxo.isSpent || vtxo.spentBy) {
    return { label: 'Spent', variant: 'muted' };
  }

  switch (vtxo.virtualStatus.state) {
    case 'preconfirmed':
      return { label: 'Preconfirmed', variant: 'warning' };
    case 'settled':
      return { label: 'Settled', variant: 'success' };
    case 'swept':
      return { label: 'Swept', variant: 'destructive' };
    default:
      return { label: vtxo.virtualStatus.state, variant: 'default' };
  }
}

function formatExpiry(vtxo: VirtualCoin): string {
  const expiry = vtxo.virtualStatus.batchExpiry;
  if (!expiry) return '--';

  const expiryDate = new Date(expiry);
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m`;
}

const statusVariantClasses: Record<string, string> = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-primary/10 text-primary',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: { label: string; variant: string } }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        statusVariantClasses[status.variant],
      )}
    >
      {status.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VtxoListProps {
  vtxos: VirtualCoin[];
  showScript?: boolean;
  variant?: ListStyle;
  className?: string;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">No VTXOs found</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table variant (original)
// ---------------------------------------------------------------------------

function VtxoTable({ vtxos, showScript, className }: { vtxos: VirtualCoin[]; showScript?: boolean; className?: string }) {
  const handleCopyOutpoint = useCallback((txid: string, vout: number) => {
    copyToClipboard(`${txid}:${vout}`);
  }, []);

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Outpoint
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Amount
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Expiry
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vtxos.map((vtxo) => {
              const status = getVtxoStatus(vtxo);
              const outpointStr = `${vtxo.txid}:${vtxo.vout}`;

              return (
                <tr
                  key={outpointStr}
                  className="hover:bg-secondary/20 transition-colors duration-150"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tx/${vtxo.txid}`}
                        className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150"
                      >
                        {truncateHash(vtxo.txid, 8, 6)}:{vtxo.vout}
                      </Link>
                      <button
                        onClick={() => handleCopyOutpoint(vtxo.txid, vtxo.vout)}
                        className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
                        title="Copy outpoint"
                        aria-label="Copy outpoint to clipboard"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <Link
                        href={`/tx/${vtxo.txid}`}
                        className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
                        title="View transaction"
                        aria-label="View transaction details"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay
                      sats={vtxo.value}
                      className="text-foreground font-mono text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatExpiry(vtxo)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards variant
// ---------------------------------------------------------------------------

function VtxoCards({ vtxos, showScript, className }: { vtxos: VirtualCoin[]; showScript?: boolean; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {vtxos.map((vtxo) => {
        const status = getVtxoStatus(vtxo);
        const outpointStr = `${vtxo.txid}:${vtxo.vout}`;

        return (
          <div
            key={outpointStr}
            className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] hover:bg-secondary/20 transition-colors duration-200"
          >
            {/* Header: outpoint + copy */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <Link
                href={`/tx/${vtxo.txid}`}
                className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150 truncate min-w-0"
              >
                {truncateHash(vtxo.txid, 8, 6)}:{vtxo.vout}
              </Link>
              <CopyButton text={outpointStr} className="shrink-0" />
            </div>

            {/* Amount */}
            <div className="mb-3">
              <MoneyDisplay
                sats={vtxo.value}
                className="text-foreground font-mono text-lg font-semibold"
              />
            </div>

            {/* Footer: status + expiry */}
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={status} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatExpiry(vtxo)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dense-rows variant
// ---------------------------------------------------------------------------

function VtxoDenseRows({ vtxos, showScript, className }: { vtxos: VirtualCoin[]; showScript?: boolean; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]', className)}>
      {vtxos.map((vtxo, index) => {
        const status = getVtxoStatus(vtxo);
        const outpointStr = `${vtxo.txid}:${vtxo.vout}`;

        return (
          <div
            key={outpointStr}
            className={cn(
              'flex items-center gap-3 py-1.5 px-3 transition-colors duration-150',
              index % 2 === 0 && 'bg-secondary/30',
              'hover:bg-secondary/50',
            )}
          >
            {/* Outpoint */}
            <Link
              href={`/tx/${vtxo.txid}`}
              className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150 truncate min-w-0 shrink"
            >
              {truncateHash(vtxo.txid, 6, 4)}:{vtxo.vout}
            </Link>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Amount */}
            <MoneyDisplay
              sats={vtxo.value}
              className="text-foreground font-mono text-xs shrink-0"
            />

            {/* Status */}
            <StatusBadge status={status} />

            {/* Expiry */}
            <span className="text-xs text-muted-foreground font-mono shrink-0 w-16 text-right">
              {formatExpiry(vtxo)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (variant-aware)
// ---------------------------------------------------------------------------

export function VtxoList({ vtxos, showScript, variant: overrideVariant, className }: VtxoListProps) {
  const { preferences } = useStructure();
  const variant = overrideVariant ?? preferences.listStyle;

  if (vtxos.length === 0) {
    return <EmptyState />;
  }

  switch (variant) {
    case 'table':
      return <VtxoTable vtxos={vtxos} showScript={showScript} className={className} />;
    case 'cards':
      return <VtxoCards vtxos={vtxos} showScript={showScript} className={className} />;
    case 'dense-rows':
      return <VtxoDenseRows vtxos={vtxos} showScript={showScript} className={className} />;
    default:
      return <VtxoTable vtxos={vtxos} showScript={showScript} className={className} />;
  }
}
