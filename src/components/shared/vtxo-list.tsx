import { useCallback, useState, useRef, useLayoutEffect, createContext, useContext } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, Clock, ChevronDown, ChevronRight } from "lucide-react";
import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import type { VirtualCoin } from "@arkade-os/sdk";
import { MoneyDisplay } from "@/components/shared/money-display";
import { AssetAmountDisplay } from "@/components/shared/asset-amount-display";
import {
    BadgeStatus,
    BadgeRecoverable,
    deriveVtxoStatus,
    isRecoverable,
} from "@/components/shared/badge-status";
import { deriveExpiryKind, expiryKindLabel } from "@/lib/vtxo-display";
import { CopyButton } from "@/components/shared/copy-button";
import { truncateHash, copyToClipboard, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { constructArkAddress } from "@/lib/arkAddress";
import { useServerInfo } from "@/providers/server-info-provider";
type ListStyle = "table" | "cards" | "dense-rows";

const EMPTY_PENDING: ReadonlySet<string> = new Set<string>();

/** Pending ("unfinalized spend") outpoints, supplied by the page and read by StatusBadges. */
const PendingOutpointsContext = createContext<ReadonlySet<string>>(EMPTY_PENDING);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatExpiry(vtxo: VirtualCoin): string {
    const expiry = vtxo.virtualStatus.batchExpiry;
    if (!expiry) return "--";

    const expiryDate = new Date(expiry);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m`;
}

/**
 * What to render in the expiry slot: a terminal status word ("Settled"/"Spent")
 * for a consumed VTXO, or the live batch-expiry countdown while it is active.
 */
function expiryDisplay(vtxo: VirtualCoin): string {
    return expiryKindLabel(deriveExpiryKind(vtxo)) ?? formatExpiry(vtxo);
}

/** Attempt to derive an Arkade address from the VTXO's script or PSBT. */
function deriveAddress(
    vtxo: VirtualCoin,
    signerPubkey: string | undefined,
    network: string | undefined,
): string | null {
    // First try the vtxo.script field directly (hex scriptPubKey from indexer)
    if (vtxo.script && signerPubkey && network) {
        try {
            const scriptBytes = hex.decode(vtxo.script);
            const addr = constructArkAddress(scriptBytes, signerPubkey, network);
            if (addr) return addr;
        } catch {
            // fall through
        }
    }

    // Then try extracting from PSBT
    const psbtBase64 = (vtxo as unknown as Record<string, unknown>)._psbt;
    if (typeof psbtBase64 === "string" && signerPubkey && network) {
        try {
            const psbtBytes = Uint8Array.from(atob(psbtBase64), (c) => c.charCodeAt(0));
            const tx = btc.Transaction.fromPSBT(psbtBytes);
            const vout = vtxo.vout ?? 0;
            if (tx.outputsLength > vout) {
                const output = tx.getOutput(vout);
                if (output?.script) {
                    const addr = constructArkAddress(output.script, signerPubkey, network);
                    if (addr) return addr;
                }
            }
        } catch {
            // PSBT decode failed
        }
    }

    return null;
}

function StatusBadges({ vtxo }: { vtxo: VirtualCoin }) {
    const pendingOutpoints = useContext(PendingOutpointsContext);
    const status = deriveVtxoStatus(vtxo, pendingOutpoints);
    return (
        <span className="inline-flex items-center gap-1.5">
            <BadgeStatus status={status} />
            {isRecoverable(vtxo) && status !== "spent" && <BadgeRecoverable />}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Shared sub-components for VTXO detail fields
// ---------------------------------------------------------------------------

function CreatedAt({ vtxo }: { vtxo: VirtualCoin }) {
    if (!vtxo.createdAt) return null;
    const ts = vtxo.createdAt instanceof Date ? vtxo.createdAt.getTime() : Number(vtxo.createdAt);
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase shrink-0">Created:</span>
            <span className="text-muted-foreground font-mono break-all">{formatTimestamp(ts)}</span>
        </div>
    );
}

function SpentByLink({ vtxo }: { vtxo: VirtualCoin }) {
    if (!vtxo.spentBy || vtxo.spentBy === "") return null;
    const label = vtxo.settledBy ? "Forfeit tx:" : "Spent by:";
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase shrink-0">{label}</span>
            <Link
                to={`/tx/${vtxo.spentBy}`}
                className="font-mono text-foreground hover:text-primary transition-colors duration-150"
            >
                {truncateHash(vtxo.spentBy, 8, 8)}
            </Link>
        </div>
    );
}

function SettledByLink({ vtxo }: { vtxo: VirtualCoin }) {
    if (!vtxo.settledBy) return null;
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase shrink-0">Settled by:</span>
            <Link
                to={`/commitment-tx/${vtxo.settledBy}`}
                className="font-mono text-foreground hover:text-primary transition-colors duration-150"
            >
                {truncateHash(vtxo.settledBy, 8, 8)}
            </Link>
        </div>
    );
}

function AssetsList({ vtxo }: { vtxo: VirtualCoin }) {
    if (!vtxo.assets || vtxo.assets.length === 0) return null;
    return (
        <div className="space-y-1 text-xs">
            <span className="text-muted-foreground uppercase">Assets:</span>
            <div className="flex flex-wrap gap-2 ml-1">
                {vtxo.assets.map((asset, idx) => (
                    <div
                        key={idx}
                        className="inline-flex items-center border border-primary/20 rounded-md px-2 py-0.5"
                    >
                        <AssetAmountDisplay
                            amount={asset.amount}
                            assetId={asset.assetId}
                            valueClassName="text-foreground font-bold font-mono text-xs"
                            unitClassName="text-foreground font-mono text-xs"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function AddressLink({
    vtxo,
    signerPubkey,
    network,
    showScript,
}: {
    vtxo: VirtualCoin;
    signerPubkey: string | undefined;
    network: string | undefined;
    showScript?: boolean;
}) {
    // Use vtxo.script + server info to derive address when showScript is true
    const address = showScript || vtxo.script ? deriveAddress(vtxo, signerPubkey, network) : null;

    if (!address) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs">
            <span className="text-muted-foreground uppercase shrink-0">Address:</span>
            <Link
                to={`/address/${address}`}
                className="font-mono text-foreground hover:text-primary transition-colors duration-150 inline-flex items-center gap-1 break-all"
            >
                <span className="sm:hidden">{truncateHash(address, 8, 8)}</span>
                <span className="hidden sm:inline">{truncateHash(address, 16, 16)}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
        </div>
    );
}

function DebugToggle({ vtxo }: { vtxo: VirtualCoin }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="pt-2 border-t border-border">
            <button
                onClick={() => setOpen(!open)}
                className="text-muted-foreground hover:text-foreground text-xs uppercase font-medium transition-colors duration-150 flex items-center gap-1"
            >
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {open ? "Hide" : "Show"} raw JSON
            </button>
            {open && (
                <pre className="mt-2 p-3 bg-secondary/50 rounded-lg text-xs overflow-x-auto max-h-64">
                    <code className="text-muted-foreground">{JSON.stringify(vtxo, null, 2)}</code>
                </pre>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VtxoListProps {
    vtxos: VirtualCoin[];
    showScript?: boolean;
    variant?: ListStyle;
    className?: string;
    pendingOutpoints?: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
    return (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No VTXOs found</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Table variant
// ---------------------------------------------------------------------------

function VtxoTable({
    vtxos,
    showScript,
    className,
    signerPubkey,
    network,
}: {
    vtxos: VirtualCoin[];
    showScript?: boolean;
    className?: string;
    signerPubkey?: string;
    network?: string;
}) {
    const handleCopyOutpoint = useCallback((txid: string, vout: number) => {
        copyToClipboard(`${txid}:${vout}`);
    }, []);

    return (
        <div
            className={cn(
                "rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]",
                className,
            )}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/30">
                            <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Outpoint
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Amount
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Status
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Expiry
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {vtxos.map((vtxo) => {
                            const outpointStr = `${vtxo.txid}:${vtxo.vout}`;

                            return (
                                <VtxoTableRow
                                    key={outpointStr}
                                    vtxo={vtxo}
                                    showScript={showScript}
                                    signerPubkey={signerPubkey}
                                    network={network}
                                    onCopyOutpoint={handleCopyOutpoint}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function VtxoTableRow({
    vtxo,
    showScript,
    signerPubkey,
    network,
    onCopyOutpoint,
}: {
    vtxo: VirtualCoin;
    showScript?: boolean;
    signerPubkey?: string;
    network?: string;
    onCopyOutpoint: (txid: string, vout: number) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            {/* Main row */}
            <tr
                className={cn(
                    "hover:bg-secondary/20 transition-colors duration-150",
                    expanded && "bg-secondary/10",
                    !expanded && "border-b border-border",
                )}
            >
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
                            aria-label={expanded ? "Collapse details" : "Expand details"}
                        >
                            {expanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                            )}
                        </button>
                        <Link
                            to={`/tx/${vtxo.txid}`}
                            className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150"
                        >
                            {truncateHash(vtxo.txid, 8, 6)}:{vtxo.vout}
                        </Link>
                        <button
                            onClick={() => onCopyOutpoint(vtxo.txid, vtxo.vout)}
                            className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
                            title="Copy outpoint"
                            aria-label="Copy outpoint to clipboard"
                        >
                            <Copy className="h-3 w-3" aria-hidden="true" />
                        </button>
                    </div>
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                        <MoneyDisplay
                            sats={vtxo.value}
                            className="text-foreground font-mono text-xs"
                        />
                        {vtxo.assets &&
                            vtxo.assets.length > 0 &&
                            vtxo.assets.map((asset, idx: number) => (
                                <AssetAmountDisplay
                                    key={idx}
                                    amount={asset.amount}
                                    assetId={asset.assetId}
                                    valueClassName="text-foreground font-bold font-mono text-xs"
                                    unitClassName="text-foreground font-mono text-xs"
                                />
                            ))}
                    </div>
                </td>
                <td className="px-4 py-3 text-center">
                    <StatusBadges vtxo={vtxo} />
                </td>
                <td className="px-4 py-3 text-right">
                    <span className="text-xs text-muted-foreground font-mono">
                        {expiryDisplay(vtxo)}
                    </span>
                </td>
            </tr>

            {/* Expanded detail row */}
            {expanded && (
                <tr className="border-b border-border">
                    <td colSpan={4} className="px-4 py-3 bg-secondary/5">
                        <div className="space-y-2 pl-6">
                            <CreatedAt vtxo={vtxo} />
                            <AssetsList vtxo={vtxo} />
                            <AddressLink
                                vtxo={vtxo}
                                signerPubkey={signerPubkey}
                                network={network}
                                showScript={showScript}
                            />
                            <SpentByLink vtxo={vtxo} />
                            <SettledByLink vtxo={vtxo} />
                            <DebugToggle vtxo={vtxo} />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Cards variant
// ---------------------------------------------------------------------------

function VtxoCards({
    vtxos,
    showScript,
    className,
    signerPubkey,
    network,
}: {
    vtxos: VirtualCoin[];
    showScript?: boolean;
    className?: string;
    signerPubkey?: string;
    network?: string;
}) {
    return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)}>
            {vtxos.map((vtxo) => {
                const outpointStr = `${vtxo.txid}:${vtxo.vout}`;

                return (
                    <VtxoCard
                        key={outpointStr}
                        vtxo={vtxo}
                        outpointStr={outpointStr}
                        showScript={showScript}
                        signerPubkey={signerPubkey}
                        network={network}
                    />
                );
            })}
        </div>
    );
}

function VtxoCard({
    vtxo,
    outpointStr,
    showScript,
    signerPubkey,
    network,
}: {
    vtxo: VirtualCoin;
    outpointStr: string;
    showScript?: boolean;
    signerPubkey?: string;
    network?: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] hover:bg-secondary/20 transition-colors duration-200">
            {/* Header: outpoint + copy */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <Link
                    to={`/tx/${vtxo.txid}`}
                    className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150 truncate min-w-0"
                >
                    {truncateHash(vtxo.txid, 8, 6)}:{vtxo.vout}
                </Link>
                <CopyButton text={outpointStr} className="shrink-0" />
            </div>

            {/* Amount */}
            <div className="mb-3">
                <MoneyDisplay
                    sats={vtxo.value}
                    className="text-foreground font-mono text-lg font-semibold"
                />
            </div>

            {/* Assets */}
            <AssetsList vtxo={vtxo} />

            {/* Created at */}
            {vtxo.createdAt && (
                <div className="mt-2">
                    <CreatedAt vtxo={vtxo} />
                </div>
            )}

            {/* Address */}
            <div className="mt-2">
                <AddressLink
                    vtxo={vtxo}
                    signerPubkey={signerPubkey}
                    network={network}
                    showScript={showScript}
                />
            </div>

            {/* Spent by / Settled by */}
            {vtxo.spentBy && (
                <div className="mt-2">
                    <SpentByLink vtxo={vtxo} />
                </div>
            )}
            {vtxo.settledBy && (
                <div className="mt-2">
                    <SettledByLink vtxo={vtxo} />
                </div>
            )}

            {/* Footer: status + expiry */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                <StatusBadges vtxo={vtxo} />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono">{expiryDisplay(vtxo)}</span>
                </div>
            </div>

            {/* Debug toggle */}
            <div className="mt-3">
                <DebugToggle vtxo={vtxo} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Dense-rows variant
// ---------------------------------------------------------------------------

function VtxoDenseRows({
    vtxos,
    showScript,
    className,
    signerPubkey,
    network,
}: {
    vtxos: VirtualCoin[];
    showScript?: boolean;
    className?: string;
    signerPubkey?: string;
    network?: string;
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    const parentOffsetRef = useRef(0);

    useLayoutEffect(() => {
        parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
    }, []);

    const virtualizer = useWindowVirtualizer({
        count: vtxos.length,
        estimateSize: () => 40,
        overscan: 12,
        scrollMargin: parentOffsetRef.current,
        getItemKey: (index) => `${vtxos[index].txid}:${vtxos[index].vout}`,
    });

    return (
        <div
            ref={parentRef}
            className={cn(
                "rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]",
                className,
            )}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: "relative",
                    width: "100%",
                }}
            >
                {virtualizer.getVirtualItems().map((item) => {
                    const vtxo = vtxos[item.index];
                    return (
                        <div
                            key={item.key}
                            data-index={item.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                            }}
                        >
                            <VtxoDenseRow
                                vtxo={vtxo}
                                index={item.index}
                                showScript={showScript}
                                signerPubkey={signerPubkey}
                                network={network}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function VtxoDenseRow({
    vtxo,
    index,
    showScript,
    signerPubkey,
    network,
}: {
    vtxo: VirtualCoin;
    index: number;
    showScript?: boolean;
    signerPubkey?: string;
    network?: string;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={cn(
                "transition-colors duration-150",
                index % 2 === 0 && "bg-secondary/30",
                "hover:bg-secondary/50",
            )}
        >
            {/* Main dense row */}
            <div className="flex items-center gap-3 py-1.5 px-3">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
                    aria-label={expanded ? "Collapse" : "Expand"}
                >
                    {expanded ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronRight className="h-3 w-3" />
                    )}
                </button>

                {/* Outpoint */}
                <Link
                    to={`/tx/${vtxo.txid}`}
                    className="font-mono text-xs text-foreground hover:text-primary transition-colors duration-150 truncate min-w-0 shrink"
                >
                    {truncateHash(vtxo.txid, 6, 4)}:{vtxo.vout}
                </Link>

                {/* Spent by inline */}
                {vtxo.spentBy && (
                    <Link
                        to={`/tx/${vtxo.spentBy}`}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-mono transition-colors duration-150 shrink-0 hidden sm:inline"
                        title={`Spent by ${vtxo.spentBy}`}
                    >
                        spent:{truncateHash(vtxo.spentBy, 4, 4)}
                    </Link>
                )}

                {/* Settled by inline */}
                {vtxo.settledBy && (
                    <Link
                        to={`/commitment-tx/${vtxo.settledBy}`}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-mono transition-colors duration-150 shrink-0 hidden sm:inline"
                        title={`Settled by ${vtxo.settledBy}`}
                    >
                        settled:{truncateHash(vtxo.settledBy, 4, 4)}
                    </Link>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Amount */}
                <div className="flex items-center gap-2 shrink-0">
                    <MoneyDisplay sats={vtxo.value} className="text-foreground font-mono text-xs" />
                    {vtxo.assets &&
                        vtxo.assets.length > 0 &&
                        vtxo.assets.map((asset, idx: number) => (
                            <AssetAmountDisplay
                                key={idx}
                                amount={asset.amount}
                                assetId={asset.assetId}
                                valueClassName="text-foreground font-bold font-mono text-xs"
                                unitClassName="text-foreground font-mono text-xs"
                            />
                        ))}
                </div>

                {/* Status */}
                <StatusBadges vtxo={vtxo} />

                {/* Expiry */}
                <span className="text-xs text-muted-foreground font-mono shrink-0 w-16 text-right">
                    {expiryDisplay(vtxo)}
                </span>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-3 pb-2 pl-9 space-y-1.5">
                    <CreatedAt vtxo={vtxo} />
                    <AssetsList vtxo={vtxo} />
                    <AddressLink
                        vtxo={vtxo}
                        signerPubkey={signerPubkey}
                        network={network}
                        showScript={showScript}
                    />
                    <SpentByLink vtxo={vtxo} />
                    <SettledByLink vtxo={vtxo} />
                    <DebugToggle vtxo={vtxo} />
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component (variant-aware)
// ---------------------------------------------------------------------------

export function VtxoList({
    vtxos,
    showScript,
    variant: overrideVariant,
    className,
    pendingOutpoints,
}: VtxoListProps) {
    const { serverInfo } = useServerInfo();
    const variant = overrideVariant ?? "table";

    const signerPubkey = serverInfo?.signerPubkey;
    const network = serverInfo?.network;

    if (vtxos.length === 0) {
        return <EmptyState />;
    }

    const body = (() => {
        switch (variant) {
            case "cards":
                return (
                    <VtxoCards
                        vtxos={vtxos}
                        showScript={showScript}
                        className={className}
                        signerPubkey={signerPubkey}
                        network={network}
                    />
                );
            case "dense-rows":
                return (
                    <VtxoDenseRows
                        vtxos={vtxos}
                        showScript={showScript}
                        className={className}
                        signerPubkey={signerPubkey}
                        network={network}
                    />
                );
            case "table":
            default:
                return (
                    <VtxoTable
                        vtxos={vtxos}
                        showScript={showScript}
                        className={className}
                        signerPubkey={signerPubkey}
                        network={network}
                    />
                );
        }
    })();

    return (
        <PendingOutpointsContext.Provider value={pendingOutpoints ?? EMPTY_PENDING}>
            {body}
        </PendingOutpointsContext.Provider>
    );
}
