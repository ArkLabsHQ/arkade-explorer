export function formatBTC(sats: number | bigint): string {
    const value = BigInt(sats);
    const absolute = value < 0n ? -value : value;
    const whole = (absolute / 100_000_000n).toLocaleString("en-US");
    const fraction = (absolute % 100_000_000n).toString().padStart(8, "0");
    return `${value < 0n ? "-" : ""}${whole}.${fraction}`;
}

export function formatAssetAmount(amount: number | bigint, decimals: number): string {
    const digits = BigInt(amount)
        .toString()
        .replace(/^-/, "")
        .padStart(decimals + 1, "0");
    const whole = decimals === 0 ? digits : digits.slice(0, -decimals);
    const fraction = decimals === 0 ? "" : digits.slice(-decimals).replace(/0+$/, "");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${amount < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function satsToBTC(sats: number | string): string {
    const amount = typeof sats === "string" ? parseInt(sats) : sats;
    return (amount / 100000000).toFixed(8);
}

export function formatCompactNumber(num: number): string {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
}

export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}
