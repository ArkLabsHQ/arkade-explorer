'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useAnimationControls } from 'framer-motion';
import { Activity, ArrowUpRight } from 'lucide-react';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { PageTransition } from '@/components/shared/page-transition';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

function ActivityPulseWrapper({ children }: { children: React.ReactNode }) {
  const controls = useAnimationControls();
  const { subscribeToNewActivity } = useActivityStream();

  useEffect(() => {
    const unsubscribe = subscribeToNewActivity(() => {
      controls.start({
        scale: [1, 1.02, 1],
        opacity: [1, 0.85, 1],
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
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          No recent activity. Transactions will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-foreground">Recent activity</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live
        </span>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="px-4 py-3 hover:bg-secondary/50 transition-colors duration-150"
          >
            {activity.txid ? (
              <Link
                href={`/tx/${activity.txid}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{activity.description}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {truncateHash(activity.txid)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </Link>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-foreground truncate">{activity.description}</p>
                <span className="text-xs text-muted-foreground shrink-0">
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

export function HomePageClient() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <ActivityPulseWrapper>
          <ActivityFeed />
        </ActivityPulseWrapper>

        <div className="text-center py-2">
          <a
            href={EXTERNAL_LINKS.DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors duration-200"
          >
            Learn more about Arkade
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </PageTransition>
  );
}
