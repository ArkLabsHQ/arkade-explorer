'use client';

type VtxoStatus = 'spendable' | 'spent' | 'swept' | 'preconfirmed' | 'settled' | 'expired';

interface BadgeStatusProps {
  status: VtxoStatus;
  className?: string;
}

const STATUS_STYLES: Record<VtxoStatus, string> = {
  spendable: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  spent: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  swept: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  preconfirmed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  settled: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  expired: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
};

export function BadgeStatus({ status, className = '' }: BadgeStatusProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[status]} ${className}`}
    >
      {status}
    </span>
  );
}

/**
 * Derive a display status from VTXO fields.
 */
export function deriveVtxoStatus(vtxo: {
  isSpent?: boolean;
  isSwept?: boolean;
  isPreconfirmed?: boolean;
  virtualStatus?: { state: string };
}): VtxoStatus {
  if (vtxo.isSwept) return 'swept';
  if (vtxo.isSpent) return 'spent';
  if (vtxo.isPreconfirmed) return 'preconfirmed';
  if (vtxo.virtualStatus?.state === 'settled') return 'settled';
  if (vtxo.virtualStatus?.state === 'swept') return 'swept';
  if (vtxo.virtualStatus?.state === 'spent') return 'spent';
  if (vtxo.virtualStatus?.state === 'preconfirmed') return 'preconfirmed';
  return 'spendable';
}
