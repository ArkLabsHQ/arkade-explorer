import { useMoneyDisplay } from "@/providers/money-display-provider";
import { formatBTC } from "@/lib/formatters";

interface MoneyDisplayProps {
    sats: number | bigint;
    className?: string;
    valueClassName?: string;
    unitClassName?: string;
    showUnit?: boolean;
    layout?: "inline" | "block";
}

export function MoneyDisplay({
    sats,
    className = "",
    valueClassName = "",
    unitClassName = "",
    showUnit = true,
    layout = "inline",
}: MoneyDisplayProps) {
    const { unit } = useMoneyDisplay();
    const value = unit === "btc" ? formatBTC(sats) : sats.toLocaleString("en-US");
    const unitLabel = unit === "btc" ? "BTC" : "sats";

    if (layout === "block") {
        return (
            <div className={`min-w-0 ${className}`}>
                <div className={`tabular-nums ${valueClassName}`}>{value}</div>
                {showUnit && <div className={unitClassName}>{unitLabel}</div>}
            </div>
        );
    }

    return (
        <span className={`whitespace-nowrap ${className}`}>
            <span className={`tabular-nums ${valueClassName}`}>{value}</span>
            {showUnit && <span className={unitClassName}> {unitLabel}</span>}
        </span>
    );
}
