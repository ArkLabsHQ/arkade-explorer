import { describe, it, expect } from "vitest";
import { deriveVtxoStatus, isRecoverable } from "@/components/shared/badge-status";

const base = { txid: "aa", vout: 0 };

describe("deriveVtxoStatus", () => {
    it("is spendable when not spent", () => {
        expect(deriveVtxoStatus({ ...base })).toBe("spendable");
    });

    it("is spent when isSpent is true and no pending set is given", () => {
        expect(deriveVtxoStatus({ ...base, isSpent: true })).toBe("spent");
    });

    it("is spent when spentBy is set", () => {
        expect(deriveVtxoStatus({ ...base, spentBy: "bb" })).toBe("spent");
    });

    it("is unfinalized when spent and the outpoint is in the pending set", () => {
        const pending = new Set(["aa:0"]);
        expect(deriveVtxoStatus({ ...base, isSpent: true }, pending)).toBe("unfinalized");
    });

    it("stays spent when spent but the outpoint is NOT in the pending set", () => {
        const pending = new Set(["cc:1"]);
        expect(deriveVtxoStatus({ ...base, isSpent: true }, pending)).toBe("spent");
    });

    it("never marks an unspent VTXO unfinalized, even if its outpoint is in the set", () => {
        const pending = new Set(["aa:0"]); // a preconfirmed-but-unspent VTXO can appear here
        expect(deriveVtxoStatus({ ...base }, pending)).toBe("spendable");
    });
});

describe("isRecoverable", () => {
    it("is recoverable when swept explicitly or through virtual status", () => {
        expect(isRecoverable({ isSwept: true })).toBe(true);
        expect(isRecoverable({ virtualStatus: { state: "swept" } })).toBe(true);
    });

    it("is recoverable when its expiry date is in the past", () => {
        expect(isRecoverable({ expiresAt: new Date(Date.now() - 1000) })).toBe(true);
        expect(isRecoverable({ expiresAt: String(Math.floor(Date.now() / 1000) - 1) })).toBe(true);
    });

    it("is not recoverable when it is neither swept nor expired", () => {
        expect(isRecoverable({ expiresAt: new Date(Date.now() + 60_000) })).toBe(false);
        expect(isRecoverable({ virtualStatus: { state: "spendable" } })).toBe(false);
        expect(isRecoverable({})).toBe(false);
    });
});
