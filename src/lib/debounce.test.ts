import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "@/lib/debounce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("debounce", () => {
    it("invokes once after the wait, collapsing rapid calls", () => {
        const fn = vi.fn();
        const d = debounce(fn, 1000);
        d();
        d();
        d();
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("passes the arguments from the last call", () => {
        const fn = vi.fn();
        const d = debounce(fn, 500);
        d("a");
        d("b");
        vi.advanceTimersByTime(500);
        expect(fn).toHaveBeenCalledWith("b");
    });

    it("cancel() prevents a pending invocation", () => {
        const fn = vi.fn();
        const d = debounce(fn, 500);
        d();
        d.cancel();
        vi.advanceTimersByTime(500);
        expect(fn).not.toHaveBeenCalled();
    });
});
