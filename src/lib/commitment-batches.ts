import type { CommitmentTx } from "@arkade-os/sdk";

export function commitmentBatchEntries(txid: string, batches?: CommitmentTx["batches"]) {
    return Object.entries(batches ?? {}).map(([key, info]) => ({
        outpoint: /^\d+$/.test(key) ? `${txid}:${key}` : key,
        info,
    }));
}
