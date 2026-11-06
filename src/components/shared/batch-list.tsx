import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Leaf, TreePine } from "lucide-react";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
    BadgeStatus,
    BadgeRecoverable,
    deriveVtxoStatus,
    isRecoverable,
} from "@/components/shared/badge-status";
import { CopyButton } from "@/components/shared/copy-button";
import { VtxoList } from "@/components/shared/vtxo-list";
import { truncateHash, formatTimestamp } from "@/lib/utils";
import { indexerClient } from "@/lib/api/indexer";
import { fetchAllPages } from "@/lib/api/fetchAllPages";
import type { BatchInfo, Outpoint, VirtualCoin } from "@arkade-os/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchEntry {
    outpoint: string; // "txid:vout" key from batches record
    info: BatchInfo;
}

interface BatchListProps {
    batches: BatchEntry[];
}

interface TreeNode {
    txid: string;
    children: Record<number, string>;
}

interface LeafVtxo {
    outpoint: Outpoint;
    amount?: string;
    isSpent?: boolean;
    isSwept?: boolean;
    isPreconfirmed?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOutpointKey(key: string): Outpoint | null {
    const parts = key.split(":");
    if (parts.length !== 2) return null;
    const txid = parts[0];
    const vout = parseInt(parts[1], 10);
    if (isNaN(vout)) return null;
    return { txid, vout };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
    const [expanded, setExpanded] = useState(false);
    const childEntries = Object.entries(node.children);
    const hasChildren = childEntries.length > 0;

    return (
        <div style={{ paddingLeft: `${depth * 16}px` }}>
            <div className="flex items-center gap-2 py-1">
                {hasChildren ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} transaction ${truncateHash(node.txid, 6, 6)}`}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-200"
                    >
                        {expanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                    </button>
                ) : (
                    <span className="w-4" />
                )}
                <TreePine className="h-3 w-3 text-muted-foreground shrink-0" />
                <Link
                    to={`/tx/${node.txid}`}
                    className="min-w-0 text-xs font-mono text-foreground hover:underline truncate"
                    title={node.txid}
                >
                    {truncateHash(node.txid, 10, 10)}
                </Link>
                <CopyButton text={node.txid} />
                {hasChildren && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                        ({childEntries.length} outputs)
                    </span>
                )}
            </div>
            {expanded && hasChildren && (
                <div className="border-l border-border ml-2">
                    {childEntries.map(([vout, childTxid]) => (
                        <div
                            key={`${vout}-${childTxid}`}
                            style={{ paddingLeft: "16px" }}
                            className="flex items-center gap-2 py-1"
                        >
                            <span className="text-xs text-muted-foreground">:{vout}</span>
                            <Link
                                to={`/tx/${childTxid}`}
                                className="min-w-0 text-xs font-mono text-foreground hover:underline truncate"
                                title={childTxid}
                            >
                                {truncateHash(childTxid, 10, 10)}
                            </Link>
                            <CopyButton text={childTxid} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function LeafVtxoRow({ leaf, expiresAt }: { leaf: LeafVtxo; expiresAt?: string }) {
    const recoverable = isRecoverable({ isSwept: leaf.isSwept, expiresAt });
    const outpointStr = `${leaf.outpoint.txid}:${leaf.outpoint.vout}`;
    const status = deriveVtxoStatus({ isSpent: leaf.isSpent });

    return (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-3 hover:bg-secondary/30">
            <Leaf className="h-3 w-3 text-muted-foreground shrink-0" />
            <Link
                to={`/tx/${leaf.outpoint.txid}`}
                className="min-w-0 truncate font-mono text-xs text-foreground hover:underline"
                title={outpointStr}
            >
                {truncateHash(outpointStr, 12, 12)}
            </Link>
            <CopyButton text={outpointStr} />
            <div className="col-span-2 col-start-2 flex min-w-0 flex-wrap items-center gap-2">
                {leaf.amount && (
                    <MoneyDisplay
                        sats={parseInt(leaf.amount)}
                        className="text-xs text-foreground"
                    />
                )}
                <BadgeStatus status={status} />
                {recoverable && status !== "spent" && <BadgeRecoverable />}
            </div>
        </div>
    );
}

function BatchItem({ batch }: { batch: BatchEntry }) {
    const [expanded, setExpanded] = useState(false);
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [leaves, setLeaves] = useState<LeafVtxo[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [vtxosData, setVtxosData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [virtualTxsData, setVirtualTxsData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const outpoint = parseOutpointKey(batch.outpoint);
    const expiryDate = batch.info.expiresAt ? formatTimestamp(batch.info.expiresAt) : "--";
    const totalAmount = parseInt(batch.info.totalOutputAmount || "0");

    // Enrich VTXOs with PSBT data from virtual transactions
    const enrichedVtxos: VirtualCoin[] = useMemo(() => {
        if (!vtxosData?.vtxos) return [];
        if (!virtualTxsData?.txs) return vtxosData.vtxos;

        return vtxosData.vtxos.map((vtxo: VirtualCoin) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const virtualTx = virtualTxsData.txs.find((t: any) => t.txid === vtxo.txid);
            if (virtualTx?.tx) {
                return { ...vtxo, _psbt: virtualTx.tx };
            }
            return vtxo;
        });
    }, [vtxosData, virtualTxsData]);

    const handleToggle = useCallback(async () => {
        if (!expanded && !loaded && outpoint) {
            setLoading(true);
            try {
                const [treeResult, leavesResult] = await Promise.all([
                    fetchAllPages((opts) => indexerClient.getVtxoTree(outpoint, opts), "vtxoTree"),
                    fetchAllPages(
                        (opts) => indexerClient.getVtxoTreeLeaves(outpoint, opts),
                        "leaves",
                    ),
                ]);

                setTree(treeResult.vtxoTree || []);
                const rawLeaves: Outpoint[] = leavesResult.leaves || [];
                setLeaves(
                    rawLeaves.map((l: Outpoint) => ({
                        outpoint: l,
                    })),
                );

                // Fetch full VTXO data for leaves
                const leafOutpoints = rawLeaves.map((l: Outpoint) => ({
                    txid: l.txid,
                    vout: l.vout,
                }));

                if (leafOutpoints.length > 0) {
                    const vtxosResult = await fetchAllPages(
                        (opts) => indexerClient.getVtxos({ outpoints: leafOutpoints, ...opts }),
                        "vtxos",
                    );
                    setVtxosData(vtxosResult);

                    // Fetch PSBTs via virtual txs
                    const leafTxids = [...new Set(rawLeaves.map((l: Outpoint) => l.txid))];
                    if (leafTxids.length > 0) {
                        try {
                            const vtxsResult = await fetchAllPages(
                                (opts) => indexerClient.getVirtualTxs(leafTxids, opts),
                                "txs",
                            );
                            const txsWithIds = vtxsResult.txs.map((tx: string, idx: number) => ({
                                txid: leafTxids[idx],
                                tx,
                            }));
                            setVirtualTxsData({ txs: txsWithIds });
                        } catch {
                            // Virtual txs may not be available for all leaves
                        }
                    }
                }

                setLoaded(true);
            } catch (err) {
                console.error("Failed to load batch tree:", err);
            } finally {
                setLoading(false);
            }
        }
        setExpanded(!expanded);
    }, [expanded, loaded, outpoint]);

    // Derive batch index from the outpoint key (e.g., "txid:2" -> "2", or plain "2" -> "2")
    const batchIndex = batch.outpoint.includes(":") ? batch.outpoint.split(":")[1] : batch.outpoint;

    return (
        <div
            id={`batch-${batchIndex}`}
            className="overflow-hidden rounded-xl border border-border bg-card scroll-mt-20"
        >
            {/* Header (always visible) */}
            <button
                onClick={handleToggle}
                aria-expanded={expanded}
                aria-controls={`batch-details-${batchIndex}`}
                className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-secondary/30 transition-colors duration-200 sm:px-5"
            >
                {expanded ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-medium text-foreground">
                            Batch output {batchIndex}
                        </span>
                        {outpoint && (
                            <span
                                className="min-w-0 truncate font-mono text-xs text-muted-foreground"
                                title={batch.outpoint}
                            >
                                {truncateHash(batch.outpoint, 8, 8)}
                            </span>
                        )}
                        {batch.info.swept && (
                            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                                Swept
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]">
                        <MoneyDisplay
                            sats={totalAmount}
                            className="text-sm font-medium text-foreground"
                        />
                        <span className="tabular-nums">
                            {batch.info.totalOutputVtxos} VTXO
                            {batch.info.totalOutputVtxos !== 1 ? "s" : ""}
                        </span>
                        <span className="col-span-2 sm:col-span-1">Expires {expiryDate}</span>
                    </div>
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div id={`batch-details-${batchIndex}`} className="border-t border-border">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="ml-3 text-sm text-muted-foreground">
                                Loading tree data...
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-5 p-4 sm:p-5">
                            {/* Batch metadata */}
                            <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg bg-secondary/20 p-3 lg:grid-cols-4">
                                <div>
                                    <span className="text-xs text-muted-foreground block mb-0.5">
                                        Amount
                                    </span>
                                    <MoneyDisplay
                                        sats={totalAmount}
                                        className="text-sm font-semibold text-foreground"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block mb-0.5">
                                        VTXOs
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {batch.info.totalOutputVtxos}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block mb-0.5">
                                        Expires
                                    </span>
                                    <span className="text-sm text-foreground">{expiryDate}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block mb-0.5">
                                        Status
                                    </span>
                                    <span className="text-sm text-foreground">
                                        {batch.info.swept ? "Swept" : "Active"}
                                    </span>
                                </div>
                            </div>

                            {/* VTXO tree */}
                            {tree.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <TreePine className="h-4 w-4 text-muted-foreground" />
                                        VTXO tree ({tree.length}{" "}
                                        {tree.length === 1 ? "node" : "nodes"})
                                    </h4>
                                    <div className="max-h-80 overflow-y-auto rounded-lg bg-secondary/20 p-3">
                                        {tree.map((node) => (
                                            <TreeNodeView key={node.txid} node={node} depth={0} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Leaf VTXOs (enriched with full data) */}
                            {enrichedVtxos.length > 0 ? (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Leaf className="h-4 w-4 text-muted-foreground" />
                                        Leaf outputs ({enrichedVtxos.length})
                                    </h4>
                                    <VtxoList vtxos={enrichedVtxos} showScript />
                                </div>
                            ) : leaves.length > 0 ? (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Leaf className="h-4 w-4 text-muted-foreground" />
                                        Leaf outputs ({leaves.length})
                                    </h4>
                                    <div className="max-h-60 overflow-y-auto rounded-lg bg-secondary/20 divide-y divide-border">
                                        {leaves.map((leaf) => (
                                            <LeafVtxoRow
                                                key={`${leaf.outpoint.txid}:${leaf.outpoint.vout}`}
                                                expiresAt={batch.info.expiresAt}
                                                leaf={leaf}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {tree.length === 0 && leaves.length === 0 && loaded && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No tree data available for this batch.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BatchList({ batches }: BatchListProps) {
    if (batches.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                    No batches found in this commitment transaction.
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold text-foreground">Batches</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                    {batches.length.toLocaleString()} batch{batches.length !== 1 ? "es" : ""}
                </span>
            </div>
            <div className="space-y-3">
                {batches.map((batch) => (
                    <BatchItem key={batch.outpoint} batch={batch} />
                ))}
            </div>
        </section>
    );
}
