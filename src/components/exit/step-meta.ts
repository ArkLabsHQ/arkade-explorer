import type { ExecutorEvent, ExitStep } from "@arkade-os/sdk";

export type StepPhase = "pending" | "active" | "confirmed" | "waiting" | "failed" | "skipped";

/** Human labels for each transported step kind. */
export const KIND_LABEL: Record<ExitStep["kind"], string> = {
    broadcast: "Fund splitter",
    package: "Unroll (pre-funded)",
    bump: "Unroll (fee-bumped)",
    sweep: "Sweep to destination",
};

/**
 * Map a live executor status to a display phase. `skipped` is overloaded by
 * the executor: with no reason the step was already onchain (a genuine success),
 * but with a reason it was skipped because its branch failed upstream — so it
 * must NOT render as confirmed.
 */
export function phaseFor(status: ExecutorEvent["status"], reason?: string): StepPhase {
    switch (status) {
        case "confirmed":
            return "confirmed";
        case "skipped":
            return reason ? "skipped" : "confirmed";
        case "failed":
            return "failed";
        case "waiting_csv":
            return "waiting";
        case "warning":
        case "broadcast":
            return "active";
    }
}

/** Semantic classes per phase, using the explorer's colour conventions. */
export const PHASE_STYLE: Record<
    StepPhase,
    { dot: string; text: string; label: string; ring: string }
> = {
    pending: {
        dot: "bg-muted-foreground/40",
        text: "text-muted-foreground",
        label: "Pending",
        ring: "border-border",
    },
    active: {
        dot: "bg-blue-500 animate-pulse",
        text: "text-blue-600 dark:text-blue-400",
        label: "In flight",
        ring: "border-blue-500/50",
    },
    waiting: {
        dot: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
        label: "Waiting for timelock",
        ring: "border-amber-500/50",
    },
    confirmed: {
        dot: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        label: "Confirmed",
        ring: "border-emerald-500/50",
    },
    failed: {
        dot: "bg-destructive",
        text: "text-destructive",
        label: "Failed",
        ring: "border-destructive/50",
    },
    skipped: {
        dot: "bg-muted-foreground/40",
        text: "text-muted-foreground",
        label: "Skipped",
        ring: "border-border",
    },
};
