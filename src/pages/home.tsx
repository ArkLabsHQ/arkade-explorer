import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useAnimationControls } from "framer-motion";
import { Activity, ArrowUpRight } from "lucide-react";
import { useActivityStream } from "@/providers/activity-stream-provider";
import { truncateHash } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatters";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { PageTransition } from "@/components/shared/page-transition";

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

function ActivityPulseWrapper({ children }: { children: React.ReactNode }) {
    const controls = useAnimationControls();
    const { subscribeToNewActivity } = useActivityStream();

    useEffect(() => {
        const unsubscribe = subscribeToNewActivity(() => {
            controls.start({
                scale: [1, 1.01, 1],
                transition: { duration: 0.2, ease: EASE_OUT },
            });
        });
        return unsubscribe;
    }, [controls, subscribeToNewActivity]);

    return <motion.div animate={controls}>{children}</motion.div>;
}

function ActivityFeed() {
    const { activities, isVisible } = useActivityStream();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isVisible || activities.length === 0) {
        return (
            <div
                className="rounded-xl bg-card p-8 text-center"
                style={{
                    boxShadow:
                        "0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
                }}
            >
                <Activity
                    className="h-6 w-6 text-muted-foreground mx-auto mb-2"
                    aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                    No recent activity. Transactions will appear here in real time.
                </p>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl bg-card overflow-hidden"
            style={{
                boxShadow:
                    "0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
            }}
        >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Recent activity</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    Live
                </span>
            </div>
            <div className="divide-y divide-border max-h-[32rem] overflow-y-auto">
                {activities.map((activity) => (
                    <motion.div
                        key={activity.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                    >
                        {activity.txid ? (
                            <Link
                                to={`/tx/${activity.txid}`}
                                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-secondary/40 transition-colors duration-200"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm text-foreground truncate">
                                        {activity.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                                        {truncateHash(activity.txid)}
                                    </p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                    {formatRelativeTime(activity.timestamp)}
                                </span>
                            </Link>
                        ) : (
                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                                <p className="text-sm text-foreground truncate">
                                    {activity.description}
                                </p>
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                    {formatRelativeTime(activity.timestamp)}
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export function HomePage() {
    return (
        <PageTransition>
            <div className="space-y-6">
                <ActivityPulseWrapper>
                    <ActivityFeed />
                </ActivityPulseWrapper>

                <div className="text-center">
                    <a
                        href={EXTERNAL_LINKS.DOCS}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                        Learn more about Arkade
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>
        </PageTransition>
    );
}
