type SpentStatus = "spendable" | "spent" | "unfinalized";

const SPENT_STYLES: Record<SpentStatus, string> = {
    spendable: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    spent: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    unfinalized: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

const SPENT_LABELS: Record<SpentStatus, string> = {
    spendable: "Unspent",
    spent: "Spent",
    unfinalized: "Unfinalized Spend",
};

export function BadgeStatus({
    status,
    className = "",
}: {
    status: SpentStatus;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${SPENT_STYLES[status]} ${className}`}
        >
            {SPENT_LABELS[status]}
        </span>
    );
}

const RECOVERABLE_STYLE = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";

export function BadgeRecoverable({ className = "" }: { className?: string }) {
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
 *
 * When `pendingOutpoints` is provided, a spent VTXO whose outpoint is in that set
 * (the indexer's `pendingOnly` view) is reported as `unfinalized` — its spend was
 * submitted but not finalized. The check is gated on the VTXO actually being spent,
 * so an unspent/preconfirmed VTXO in the set is never mislabeled.
 */
export function deriveVtxoStatus(
    vtxo: {
        txid?: string;
        vout?: number;
        isSpent?: boolean;
        spentBy?: string;
        virtualStatus?: { state: string };
    },
    pendingOutpoints?: ReadonlySet<string>,
): SpentStatus {
    const spent =
        vtxo.isSpent === true ||
        (!!vtxo.spentBy && vtxo.spentBy !== "") ||
        vtxo.virtualStatus?.state === "spent";
    if (!spent) return "spendable";
    if (
        pendingOutpoints &&
        vtxo.txid !== undefined &&
        vtxo.vout !== undefined &&
        pendingOutpoints.has(`${vtxo.txid}:${vtxo.vout}`)
    ) {
        return "unfinalized";
    }
    return "spent";
}

/**
 * Whether this VTXO is in a recoverable state (swept or expired).
 */
export function isRecoverable(vtxo: {
    isSwept?: boolean;
    virtualStatus?: { state: string };
}): boolean {
    if (vtxo.isSwept) return true;
    return vtxo.virtualStatus?.state === "swept";
}
