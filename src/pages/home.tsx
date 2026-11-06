import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowDownUp, ArrowUpRight, Layers, Radio } from "lucide-react";
import { useActivityStream } from "@/providers/activity-stream-provider";
import { activityTitle, type ActivityItem } from "@/lib/activity";
import { cn, truncateHash } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatters";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { MoneyDisplay } from "@/components/shared/money-display";
import { PageTransition } from "@/components/shared/page-transition";
import { CopyButton } from "@/components/shared/copy-button";

function ActivityRow({ activity }: { activity: ActivityItem }) {
    const Icon = activity.type === "batch" ? Layers : ArrowDownUp;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_9rem_12rem_5rem]">
            <div className="min-w-0 flex items-center gap-3">
                <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground sm:flex">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium">{activityTitle(activity)}</p>
                    {activity.txid && activity.type === "sweep" ? (
                        <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                            <span className="truncate font-mono text-xs" title={activity.txid}>
                                {truncateHash(activity.txid, 10, 8)}
                            </span>
                            <CopyButton text={activity.txid} />
                        </div>
                    ) : activity.txid ? (
                        <Link
                            to={`/${activity.type === "batch" ? "commitment-tx" : "tx"}/${activity.txid}`}
                            className="mt-1 inline-block max-w-full truncate font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                            title={activity.txid}
                        >
                            {truncateHash(activity.txid, 10, 8)}
                        </Link>
                    ) : null}
                </div>
            </div>
            <div className="col-start-1 row-start-2 text-xs text-muted-foreground lg:col-auto lg:row-auto">
                {activity.spentCount !== undefined && activity.createdCount !== undefined ? (
                    <p className="tabular-nums">
                        <span className="text-foreground">{activity.spentCount}</span> spent
                        <span className="mx-1.5" aria-hidden="true">
                            /
                        </span>
                        <span className="text-foreground">{activity.createdCount}</span> created
                    </p>
                ) : (
                    <p>{activity.description.split(": ")[1] || "Details unavailable"}</p>
                )}
                {activity.sweptCount !== undefined && (
                    <p className="mt-1 tabular-nums">{activity.sweptCount} swept</p>
                )}
            </div>
            <div
                className="col-start-2 row-start-2 min-w-0 text-right lg:col-auto lg:row-auto"
                aria-label="Created VTXO output value"
            >
                {activity.outputSats !== undefined ? (
                    <MoneyDisplay
                        sats={BigInt(activity.outputSats)}
                        className="whitespace-nowrap text-sm"
                        valueClassName="font-medium tabular-nums"
                        unitClassName="text-xs text-muted-foreground"
                    />
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                )}
                {activity.assetCount !== undefined && activity.assetCount > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {activity.assetCount} {activity.assetCount === 1 ? "asset" : "assets"}
                    </p>
                )}
            </div>
            <time
                dateTime={new Date(activity.timestamp).toISOString()}
                title={`Observed ${new Date(activity.timestamp).toLocaleString()}`}
                className="col-start-2 row-start-1 text-right text-xs text-muted-foreground whitespace-nowrap lg:col-auto lg:row-auto"
            >
                {formatRelativeTime(activity.timestamp)}
            </time>
        </div>
    );
}

export function HomePage() {
    const { activities, connectionStatus } = useActivityStream();
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick((tick) => tick + 1), 30_000);
        return () => clearInterval(interval);
    }, []);

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Live activity
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Follow new transactions, output values, and assets across Arkade.
                        </p>
                    </div>
                    <span
                        role="status"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                    >
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                connectionStatus === "live" ? "bg-success" : "bg-muted-foreground",
                            )}
                        />
                        {connectionStatus === "live"
                            ? "Live stream"
                            : connectionStatus === "connecting"
                              ? "Connecting"
                              : "Disconnected"}
                    </span>
                </div>

                <section
                    aria-label="Recent activity"
                    className="overflow-hidden rounded-xl border border-border bg-card"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
                        <h2 className="text-sm font-medium">Recent transactions</h2>
                        <p className="text-xs text-muted-foreground">
                            VTXO output value includes change
                        </p>
                    </div>
                    <div className="hidden grid-cols-[minmax(0,1fr)_9rem_12rem_5rem] gap-x-4 border-b border-border bg-secondary/30 px-6 py-3 text-xs text-muted-foreground lg:grid">
                        <span>Transaction</span>
                        <span>VTXOs</span>
                        <span className="text-right">Output value</span>
                        <span className="text-right">Observed</span>
                    </div>
                    {activities.length > 0 ? (
                        <div className="divide-y divide-border">
                            {activities.map((activity) => (
                                <ActivityRow key={activity.id} activity={activity} />
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <Radio
                                className="mx-auto mb-4 h-6 w-6 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <h3 className="text-sm font-medium">Waiting for transactions</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                New activity appears here as it reaches the stream.
                            </p>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-6">
                        <span className="inline-flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                            {activities.length} recent{" "}
                            {activities.length === 1 ? "event" : "events"}
                        </span>
                        {connectionStatus === "disconnected" && (
                            <button
                                onClick={() => window.location.reload()}
                                className="underline underline-offset-4 hover:text-foreground"
                            >
                                Reload to reconnect
                            </button>
                        )}
                        <a
                            href={EXTERNAL_LINKS.DOCS}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
                        >
                            About Arkade <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                    </div>
                </section>
            </div>
        </PageTransition>
    );
}
