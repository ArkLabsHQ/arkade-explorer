import { describe, it, expect } from "vitest";
import type { VirtualCoin } from "@arkade-os/sdk";
import { deriveExpiryKind, expiryKindLabel } from "@/lib/vtxo-display";

function makeVtxo(p: Partial<VirtualCoin>): VirtualCoin {
    return {
        txid: "t",
        vout: 0,
        value: 0,
        spentBy: "",
        settledBy: "",
        isSpent: false,
        assets: [],
        ...p,
    } as unknown as VirtualCoin;
}

describe("deriveExpiryKind", () => {
    it('is "active" for a live, unspent vtxo', () => {
        expect(deriveExpiryKind(makeVtxo({}))).toBe("active");
    });

    it('is "settled" when settledBy is set', () => {
        expect(deriveExpiryKind(makeVtxo({ settledBy: "commit" }))).toBe("settled");
    });

    it('prefers "settled" over "spent" when both settledBy and spentBy are set (forfeit)', () => {
        expect(
            deriveExpiryKind(makeVtxo({ settledBy: "commit", spentBy: "ark", isSpent: true })),
        ).toBe("settled");
    });

    it('is "spent" when spentBy is set and there is no settle commitment', () => {
        expect(deriveExpiryKind(makeVtxo({ spentBy: "ark" }))).toBe("spent");
    });

    it('is "spent" when isSpent is true with no spend/settle txids', () => {
        expect(deriveExpiryKind(makeVtxo({ isSpent: true }))).toBe("spent");
    });

    it('is "spent" when virtualStatus.state is "spent"', () => {
        expect(
            deriveExpiryKind(
                makeVtxo({ virtualStatus: { state: "spent" } as VirtualCoin["virtualStatus"] }),
            ),
        ).toBe("spent");
    });

    it("treats empty-string txids as not settled/spent", () => {
        expect(deriveExpiryKind(makeVtxo({ settledBy: "", spentBy: "" }))).toBe("active");
    });
});

describe("expiryKindLabel", () => {
    it("labels settled and spent, and returns null for active (use the countdown)", () => {
        expect(expiryKindLabel("settled")).toBe("Settled");
        expect(expiryKindLabel("spent")).toBe("Spent");
        expect(expiryKindLabel("active")).toBeNull();
    });
});
