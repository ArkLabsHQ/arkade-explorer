import type { VirtualCoin } from "@arkade-os/sdk";

/**
 * What the "expiry" slot of a VTXO should convey.
 * - `settled`: consumed by an on-chain commitment round (`settledBy`).
 * - `spent`: spent off-chain (no settle commitment).
 * - `active`: still live; the batch-expiry countdown applies.
 */
export type ExpiryKind = "settled" | "spent" | "active";

type ExpiryKindInput = Pick<VirtualCoin, "isSpent" | "spentBy" | "settledBy"> & {
    virtualStatus?: { state?: string };
};

/**
 * Decide what a VTXO's expiry slot should show.
 *
 * `settled` takes precedence over `spent`: a forfeited VTXO is both spent and
 * settled, but the meaningful terminal state is that it settled into a
 * commitment. The batch-expiry countdown is only relevant while `active`.
 */
export function deriveExpiryKind(vtxo: ExpiryKindInput): ExpiryKind {
    if (vtxo.settledBy && vtxo.settledBy !== "") return "settled";
    const spent =
        vtxo.isSpent === true ||
        (!!vtxo.spentBy && vtxo.spentBy !== "") ||
        vtxo.virtualStatus?.state === "spent";
    if (spent) return "spent";
    return "active";
}

/**
 * Label for a terminal expiry kind, or `null` for `active` (the caller should
 * render the live batch-expiry countdown instead).
 */
export function expiryKindLabel(kind: ExpiryKind): string | null {
    switch (kind) {
        case "settled":
            return "Settled";
        case "spent":
            return "Spent";
        default:
            return null;
    }
}
