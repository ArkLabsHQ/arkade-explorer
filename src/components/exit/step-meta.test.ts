import { describe, expect, it } from "vitest";
import { phaseFor } from "./step-meta";

describe("phaseFor", () => {
    it("maps confirmed and terminal statuses directly", () => {
        expect(phaseFor("confirmed")).toBe("confirmed");
        expect(phaseFor("failed")).toBe("failed");
        expect(phaseFor("waiting_csv")).toBe("waiting");
        expect(phaseFor("broadcast")).toBe("active");
        expect(phaseFor("warning")).toBe("active");
    });

    // The executor overloads "skipped": no reason means the tx was already
    // onchain (a success), a reason means the branch failed upstream. The second
    // case must not render as a confirmed step — that would report a failed exit
    // branch as if funds had moved.
    it("treats a reasonless skip as already-onchain (confirmed)", () => {
        expect(phaseFor("skipped")).toBe("confirmed");
        expect(phaseFor("skipped", undefined)).toBe("confirmed");
    });

    it("treats a skip with a reason as skipped, never confirmed", () => {
        expect(phaseFor("skipped", "branch failed earlier")).toBe("skipped");
    });
});
