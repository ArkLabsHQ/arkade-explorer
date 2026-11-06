import { describe, expect, it } from "vitest";
import type { TxNotificationEvent } from "@arkade-os/sdk";
import { activityTitle, parseActivityEvent, type ActivityItem } from "@/lib/activity";

function frame(notification: Record<string, unknown>, type = "arkTx"): TxNotificationEvent {
    return { [type]: { txid: "txid", tx: "", ...notification } } as TxNotificationEvent;
}

describe("parseActivityEvent", () => {
    it("sums created output value and counts distinct assets without including spent value", () => {
        const activity = parseActivityEvent(
            frame({
                spentVtxos: [{ amount: "100000" }],
                spendableVtxos: [
                    { amount: "330", assets: [{ assetId: "a" }, { assetId: "b" }] },
                    { amount: "670", assets: [{ assetId: "a" }] },
                ],
            }),
            1234,
        );
        expect(activity).toMatchObject({
            type: "transaction",
            spentCount: 1,
            createdCount: 2,
            outputSats: "1000",
            assetCount: 2,
            timestamp: 1234,
        });
    });

    it("keeps large totals exact and JSON-safe", () => {
        const activity = parseActivityEvent(
            frame({
                spendableVtxos: [{ amount: "9007199254740993" }, { amount: "7" }],
            }),
        );
        expect(activity?.outputSats).toBe("9007199254741000");
        expect(JSON.parse(JSON.stringify(activity))).toEqual(activity);
    });

    it("labels commitment notifications without asserting confirmation", () => {
        const activity = parseActivityEvent(frame({ spendableVtxos: [] }, "commitmentTx"));
        expect(activity?.type).toBe("batch");
        expect(activity?.description).toBe("Commitment transaction");
        expect(activity).not.toHaveProperty("status");
        expect(activity?.outputSats).toBe("0");
    });

    it("leaves missing output amounts unknown rather than inventing a total", () => {
        expect(parseActivityEvent(frame({}))?.outputSats).toBeUndefined();
        expect(
            parseActivityEvent(frame({ spendableVtxos: [{ amount: "100" }, {}] }))?.outputSats,
        ).toBeUndefined();
        expect(
            parseActivityEvent(frame({ spendableVtxos: [{ amount: "invalid" }] }))?.outputSats,
        ).toBeUndefined();
    });

    it("reports sweep outpoint counts separately", () => {
        const activity = parseActivityEvent(
            frame({ spendableVtxos: [], sweptVtxos: [{ txid: "swept", vout: 0 }] }, "sweepTx"),
        );
        expect(activity).toMatchObject({ type: "sweep", sweptCount: 1, createdCount: 0 });
        expect(activity?.description).toBe("Sweep transaction");
    });

    it("ignores an empty frame", () => {
        expect(parseActivityEvent({})).toBeNull();
    });
});

describe("activityTitle", () => {
    it("supports cached activities from before output details were recorded", () => {
        const cached: ActivityItem = {
            id: "old",
            type: "transaction",
            timestamp: 1234,
            description: "Arkade transaction: 1 spent, 2 created",
        };
        expect(activityTitle(cached)).toBe("Arkade transaction");
        expect(cached.outputSats).toBeUndefined();
        expect(activityTitle({ ...cached, type: "batch" })).toBe("Commitment transaction");
        expect(activityTitle({ ...cached, type: "vtxo", description: "VTXO spent" })).toBe(
            "VTXO spent",
        );
    });
});
