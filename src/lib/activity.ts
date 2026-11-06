import type { TxNotificationEvent } from "@arkade-os/sdk";

export interface ActivityItem {
    id: string;
    type: "batch" | "vtxo" | "transaction" | "sweep";
    txid?: string;
    address?: string;
    timestamp: number;
    description: string;
    spentCount?: number;
    createdCount?: number;
    sweptCount?: number;
    outputSats?: string;
    assetCount?: number;
}

export function activityTitle(activity: ActivityItem): string {
    if (activity.type === "transaction") return "Arkade transaction";
    if (activity.type === "sweep") return "Sweep transaction";
    if (activity.type === "batch" && !activity.description.startsWith("New batch")) {
        return "Commitment transaction";
    }
    return activity.description;
}

export function parseActivityEvent(
    event: TxNotificationEvent,
    timestamp = Date.now(),
): ActivityItem | null {
    const notification = event.commitmentTx ?? event.arkTx ?? event.sweepTx;
    if (!notification) return null;

    const type = event.commitmentTx ? "batch" : event.sweepTx ? "sweep" : "transaction";
    const outputs = notification.spendableVtxos;
    let outputSats: string | undefined;
    if (Array.isArray(outputs)) {
        try {
            const amounts = outputs.map((output) => output.amount);
            if (amounts.every((amount) => /^\d+$/.test(String(amount)))) {
                outputSats = amounts.reduce((sum, amount) => sum + BigInt(amount), 0n).toString();
            }
        } catch {
            outputSats = undefined;
        }
    }

    const activity: ActivityItem = {
        id: `${timestamp}-${Math.random()}`,
        type,
        txid: notification.txid,
        timestamp,
        description: "",
        spentCount: notification.spentVtxos?.length,
        createdCount: outputs?.length,
        sweptCount: event.sweepTx?.sweptVtxos?.length,
        outputSats,
        assetCount: outputs
            ? new Set(
                  outputs.flatMap((output) => output.assets?.map((asset) => asset.assetId) ?? []),
              ).size
            : undefined,
    };
    activity.description = activityTitle(activity);
    return activity;
}
