import { describe, expect, it } from "vitest";
import { formatBTC, formatAssetAmount } from "./formatters";

describe("amount formatting", () => {
    it("keeps eight BTC decimals without grouping fractional digits", () => {
        expect(formatBTC(27861)).toBe("0.00027861");
        expect(formatBTC(100_000_001)).toBe("1.00000001");
        expect(formatBTC(0)).toBe("0.00000000");
    });

    it("preserves bigint precision and groups only whole bitcoins", () => {
        expect(formatBTC(123456789012345678n)).toBe("1,234,567,890.12345678");
        expect(formatBTC(-330n)).toBe("-0.00000330");
    });

    it("removes only insignificant asset zeros without rounding", () => {
        expect(formatAssetAmount(10000000000000n, 8)).toBe("100,000");
        expect(formatAssetAmount(112230000n, 8)).toBe("1.1223");
        expect(formatAssetAmount(1n, 8)).toBe("0.00000001");
        expect(formatAssetAmount(0n, 8)).toBe("0");
    });

    it("handles integer, signed, and large asset quantities exactly", () => {
        expect(formatAssetAmount(1234, 0)).toBe("1,234");
        expect(formatAssetAmount(1e21, 0)).toBe("1,000,000,000,000,000,000,000");
        expect(formatAssetAmount(-123n, 4)).toBe("-0.0123");
        expect(formatAssetAmount(123456789012345678n, 8)).toBe("1,234,567,890.12345678");
    });
});
