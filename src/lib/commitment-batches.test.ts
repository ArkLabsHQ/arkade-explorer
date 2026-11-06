import { describe, expect, it } from "vitest";
import { commitmentBatchEntries } from "./commitment-batches";

describe("commitmentBatchEntries", () => {
    const info = {
        totalOutputAmount: "7011887",
        totalOutputVtxos: 1,
        expiresAt: "1796394715",
        swept: false,
    };

    it("binds indexer output-index keys to the commitment transaction", () => {
        expect(commitmentBatchEntries("commitment", { "0": info, "2": info })).toEqual([
            { outpoint: "commitment:0", info },
            { outpoint: "commitment:2", info },
        ]);
    });

    it("preserves an already qualified outpoint", () => {
        expect(commitmentBatchEntries("commitment", { "legacy:3": info })).toEqual([
            { outpoint: "legacy:3", info },
        ]);
    });

    it("handles missing batches", () => {
        expect(commitmentBatchEntries("commitment")).toEqual([]);
    });
});
