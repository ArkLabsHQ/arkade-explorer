import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import { truncateHash } from "@/lib/utils";

interface RelatedTransaction {
    txid: string;
    children?: Record<number, string>;
}

const PAGE_SIZE = 20;

function TransactionDisclosure({
    title,
    transactions,
}: {
    title: string;
    transactions: RelatedTransaction[];
}) {
    const [expanded, setExpanded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const hiddenCount = Math.max(0, transactions.length - visibleCount);

    return (
        <details
            className="group min-w-0 rounded-xl border border-border bg-card"
            onToggle={(event) => setExpanded(event.currentTarget.open)}
        >
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 text-sm hover:bg-secondary/30 [&::-webkit-details-marker]:hidden">
                <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 font-medium">{title}</span>
                <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {transactions.length.toLocaleString()}
                </span>
            </summary>
            {expanded && (
                <div className="border-t border-border px-4 pb-3">
                    {transactions.length === 0 ? (
                        <p className="py-4 text-xs text-muted-foreground">None</p>
                    ) : (
                        <div
                            className="max-h-80 overflow-y-auto"
                            tabIndex={0}
                            role="region"
                            aria-label={title}
                        >
                            {transactions.slice(0, visibleCount).map((transaction, index) => {
                                const childCount = Object.keys(transaction.children ?? {}).length;
                                return (
                                    <div
                                        key={`${transaction.txid}-${index}`}
                                        className="flex min-w-0 items-center gap-2 border-b border-border/60 py-3 last:border-b-0"
                                    >
                                        <Link
                                            to={`/tx/${transaction.txid}`}
                                            className="min-w-0 flex-1 truncate font-mono text-xs text-foreground hover:underline"
                                            title={transaction.txid}
                                        >
                                            {truncateHash(transaction.txid, 12, 12)}
                                        </Link>
                                        {childCount > 0 && (
                                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                {childCount}{" "}
                                                {childCount === 1 ? "child" : "children"}
                                            </span>
                                        )}
                                        <CopyButton text={transaction.txid} className="shrink-0" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {hiddenCount > 0 && (
                        <button
                            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                            className="mt-3 rounded py-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Show {Math.min(PAGE_SIZE, hiddenCount).toLocaleString()} more
                        </button>
                    )}
                </div>
            )}
        </details>
    );
}

export function CommitmentRelatedTransactions({
    forfeitTxids,
    connectors,
}: {
    forfeitTxids: string[];
    connectors: Array<{ txid: string; children: Record<number, string> }>;
}) {
    return (
        <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
            <TransactionDisclosure
                title="Forfeit transactions"
                transactions={forfeitTxids.map((txid) => ({ txid }))}
            />
            <TransactionDisclosure title="Connectors" transactions={connectors} />
        </div>
    );
}
