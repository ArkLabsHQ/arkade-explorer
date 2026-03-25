'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Activity, Layers, GitBranch, Coins, Clock, ArrowRight, ChevronRight, X } from 'lucide-react';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { useServerInfo } from '@/providers/server-info-provider';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { truncateHash, cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import { ArkadeLogo } from '@/components/shared/arkade-logo';
import { EXTERNAL_LINKS } from '@/lib/constants';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

interface LiveFeedSidebarProps {
  selectedTxid: string | null;
  onSelectEvent: (txid: string, type: 'transaction' | 'round' | 'vtxo') => void;
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'round':
      return <Layers className="h-3.5 w-3.5 text-purple-400 shrink-0" />;
    case 'transaction':
      return <GitBranch className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
    case 'vtxo':
      return <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

export function LiveFeedSidebar({ selectedTxid, onSelectEvent }: LiveFeedSidebarProps) {
  const router = useRouter();
  const { activities } = useActivityStream();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredActivities, setFilteredActivities] = useState(activities);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredActivities(activities);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredActivities(
        activities.filter(
          (a) =>
            a.description.toLowerCase().includes(q) ||
            (a.txid && a.txid.toLowerCase().includes(q))
        )
      );
    }
  }, [activities, searchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;

      if (isValidTxid(q)) {
        router.push(`/tx/${q}`);
      } else if (isValidOutpoint(q)) {
        router.push(`/tx/${q}`);
      } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
        router.push(`/address/${q}`);
      }
    },
    [searchQuery, router]
  );

  return (
    <aside className="w-80 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link href="/" aria-label="Arkade Explorer home">
          <ArkadeLogo size="md" />
        </Link>
      </div>

      {/* Live feed header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-foreground">Live feed</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {activities.length} events
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} role="search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter events or search..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Activity className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery ? 'No matching events' : 'Waiting for activity...'}
            </p>
            <p className="text-xs text-muted-foreground/70 text-center mt-1">
              Events will appear here in real time
            </p>
          </div>
        ) : (
          <div className="py-1">
            <AnimatePresence initial={false}>
              {filteredActivities.map((activity) => {
                const isSelected = activity.txid === selectedTxid;

                return (
                  <motion.button
                    key={activity.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    onClick={() => {
                      if (activity.txid) {
                        onSelectEvent(activity.txid, activity.type as 'transaction' | 'round' | 'vtxo');
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 border-l-2 motion-reduce:animate-none',
                      isSelected
                        ? 'bg-primary/10 border-l-primary'
                        : 'border-l-transparent hover:bg-secondary/50'
                    )}
                  >
                    <EventIcon type={activity.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {activity.description}
                      </p>
                      {activity.txid && (
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {truncateHash(activity.txid, 8, 6)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                    {isSelected && (
                      <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <a
          href={EXTERNAL_LINKS.ARKADE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors duration-200"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Try Arkade</span>
        </a>
      </div>
    </aside>
  );
}

// Empty state for the right panel
export function SidebarWelcome() {
  const { serverInfo, isLoading } = useServerInfo();
  const { activities } = useActivityStream();

  const stats = [
    { label: 'Network', value: serverInfo?.network || '--', icon: GitBranch },
    { label: 'Session', value: serverInfo?.sessionDuration ? `${serverInfo.sessionDuration}s` : '--', icon: Clock },
    { label: 'Events', value: activities.length.toString(), icon: Activity },
    { label: 'Version', value: serverInfo?.version || '--', icon: Coins },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="text-center max-w-md"
      >
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          Arkade Explorer
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Select an event from the live feed to view its details, or search for a specific transaction or address.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.05 * i }}
                className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">{stat.label}</span>
                </div>
                <div className={cn(
                  'text-base font-heading font-semibold text-foreground',
                  isLoading && 'animate-pulse bg-muted rounded w-12 h-5',
                )}>
                  {isLoading ? '' : stat.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-3">
          {[
            { title: 'Commitment transactions', desc: 'On-chain settlement anchoring VTXOs to bitcoin', icon: Layers },
            { title: 'Arkade transactions', desc: 'Instant off-chain transfers between participants', icon: GitBranch },
            { title: 'VTXOs', desc: 'Virtual transaction outputs representing spendable coins', icon: Coins },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.2 + i * 0.06 }}
                className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3 text-left"
              >
                <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// Mobile drawer variant for sidebar
export function MobileFeedDrawer({
  open,
  onClose,
  selectedTxid,
  onSelectEvent,
}: {
  open: boolean;
  onClose: () => void;
  selectedTxid: string | null;
  onSelectEvent: (txid: string, type: 'transaction' | 'round' | 'vtxo') => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="fixed inset-x-0 bottom-0 z-50 h-[70vh] rounded-t-2xl border-t border-border bg-card shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <h2 className="text-sm font-semibold text-foreground">Live feed</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(70vh-3.5rem)]">
              <LiveFeedContent selectedTxid={selectedTxid} onSelectEvent={onSelectEvent} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Extracted feed content for reuse in mobile drawer
function LiveFeedContent({
  selectedTxid,
  onSelectEvent,
}: {
  selectedTxid: string | null;
  onSelectEvent: (txid: string, type: 'transaction' | 'round' | 'vtxo') => void;
}) {
  const { activities } = useActivityStream();

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Activity className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center">Waiting for activity...</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {activities.map((activity) => {
        const isSelected = activity.txid === selectedTxid;
        return (
          <button
            key={activity.id}
            onClick={() => {
              if (activity.txid) {
                onSelectEvent(activity.txid, activity.type as 'transaction' | 'round' | 'vtxo');
              }
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 border-l-2',
              isSelected
                ? 'bg-primary/10 border-l-primary'
                : 'border-l-transparent hover:bg-secondary/50'
            )}
          >
            <EventIcon type={activity.type} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {activity.description}
              </p>
              {activity.txid && (
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {truncateHash(activity.txid, 8, 6)}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
