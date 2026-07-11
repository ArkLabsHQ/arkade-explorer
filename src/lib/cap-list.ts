export interface CappedList<T> {
    visible: T[];
    hiddenCount: number;
}

/** Limit a list to `cap` items unless `expanded`; report how many are hidden. */
export function capList<T>(items: T[], cap: number, expanded: boolean): CappedList<T> {
    if (expanded || items.length <= cap) {
        return { visible: items, hiddenCount: 0 };
    }
    return { visible: items.slice(0, cap), hiddenCount: items.length - cap };
}
