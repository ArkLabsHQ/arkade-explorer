type SpentStatus = 'spendable' | 'spent';

const SPENT_STYLES: Record<SpentStatus, string> = {
  spendable: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  spent: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
};

export function BadgeStatus({
  status,
  className = '',
}: {
  status: SpentStatus;
  className?: string;
}) {
  const label = status === 'spendable' ? 'Unspent' : 'Spent';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${SPENT_STYLES[status]} ${className}`}
    >
      {label}
    </span>
  );
}

const RECOVERABLE_STYLE =
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';

export function BadgeRecoverable({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${RECOVERABLE_STYLE} ${className}`}
    >
      Recoverable
    </span>
  );
}

/**
 * Derive spent/unspent status from VTXO fields.
 * Swept VTXOs can still be spent or unspent independently.
 */
export function deriveVtxoStatus(vtxo: {
  isSpent?: boolean;
  spentBy?: string;
  virtualStatus?: { state: string };
}): SpentStatus {
  if (vtxo.isSpent) return 'spent';
  if (vtxo.spentBy && vtxo.spentBy !== '') return 'spent';
  if (vtxo.virtualStatus?.state === 'spent') return 'spent';
  return 'spendable';
}

/**
 * Whether this VTXO is in a recoverable state (swept or expired).
 */
export function isRecoverable(vtxo: {
  isSwept?: boolean;
  virtualStatus?: { state: string };
}): boolean {
  if (vtxo.isSwept) return true;
  return vtxo.virtualStatus?.state === 'swept';
}
