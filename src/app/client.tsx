'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useAnimationControls } from 'framer-motion';
import { Search, ArrowRight, Layers, GitBranch, Coins, Activity, Clock, ExternalLink } from 'lucide-react';
import { useServerInfo } from '@/providers/server-info-provider';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { useStructure } from '@/hooks/use-structure';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { StatsPanel } from '@/components/shared/stats-panel';
import { SearchBar } from '@/components/shared/search-bar';
import { PageTransition } from '@/components/shared/page-transition';
import { BlockTimeline } from '@/components/shared/block-timeline';
import { CommitmentBlocks } from '@/components/shared/commitment-blocks';
import { BlocksSplitHome } from '@/structures/blocks-split';
import { BlocksTabsHome } from '@/structures/blocks-tabs';
import { BlocksTimelineHome } from '@/structures/blocks-timeline';
import { TerminalView } from '@/components/shared/terminal-view';
import { SidebarWelcome } from '@/components/shared/live-feed-sidebar';
import { KanbanBoard } from '@/components/shared/kanban-board';
import { TreemapView } from '@/components/shared/treemap-view';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      if (isValidTxid(q)) {
        router.push(`/tx/${q}`);
      } else if (isValidOutpoint(q)) {
        router.push(`/tx/${q}`);
      } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
        router.push(`/address/${q}`);
      } else {
        router.push(`/tx/${q}`);
      }
      setQuery('');
    },
    [query, router],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="w-full max-w-2xl mx-auto"
    >
      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground text-center mb-3 tracking-tight">
        Arkade Explorer
      </h1>
      <p className="text-muted-foreground text-center mb-6 text-sm sm:text-base">
        Explore transactions, VTXOs, and addresses on the Arkade protocol
      </p>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by txid, address, or outpoint..."
          className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-ring/40 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.1)] transition-shadow duration-200"
        />
      </form>
    </motion.div>
  );
}

function CompactSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      if (isValidTxid(q)) {
        router.push(`/tx/${q}`);
      } else if (isValidOutpoint(q)) {
        router.push(`/tx/${q}`);
      } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
        router.push(`/address/${q}`);
      } else {
        router.push(`/tx/${q}`);
      }
      setQuery('');
    },
    [query, router],
  );

  return (
    <form onSubmit={handleSearch} className="relative max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search txid, address, or outpoint..."
        className="w-full h-10 pl-10 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
      />
    </form>
  );
}

function StatsGrid() {
  const { serverInfo, isLoading } = useServerInfo();

  const stats = [
    {
      label: 'Network',
      value: serverInfo?.network || '--',
      icon: GitBranch,
    },
    {
      label: 'Session duration',
      value: serverInfo?.sessionDuration ? `${serverInfo.sessionDuration}s` : '--',
      icon: Clock,
    },
    {
      label: 'Unilateral exit delay',
      value: serverInfo?.unilateralExitDelay ? `${serverInfo.unilateralExitDelay} blocks` : '--',
      icon: Layers,
    },
    {
      label: 'Version',
      value: serverInfo?.version || '--',
      icon: Coins,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.05 * i }}
            className="rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className={cn(
              'text-lg font-heading font-semibold text-foreground',
              isLoading && 'animate-pulse bg-muted rounded w-16 h-6',
            )}>
              {isLoading ? '' : stat.value}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function StatsInlineRow() {
  const { serverInfo, isLoading } = useServerInfo();

  const stats = [
    { label: 'Network', value: serverInfo?.network || '--' },
    { label: 'Session duration', value: serverInfo?.sessionDuration ? `${serverInfo.sessionDuration}s` : '--' },
    { label: 'Exit delay', value: serverInfo?.unilateralExitDelay ? `${serverInfo.unilateralExitDelay} blocks` : '--' },
  ];

  return (
    <div className="flex items-center gap-6 text-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <span className="text-muted-foreground">{stat.label}:</span>
          <span className={cn(
            'font-medium text-foreground',
            isLoading && 'animate-pulse bg-muted rounded w-12 h-4 inline-block',
          )}>
            {isLoading ? '' : stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatsMinimal() {
  const { serverInfo, isLoading } = useServerInfo();

  return (
    <div className="text-center text-sm text-muted-foreground">
      {isLoading ? (
        <div className="animate-pulse bg-muted rounded w-48 h-4 mx-auto" />
      ) : (
        <span>
          {serverInfo?.network || 'Unknown network'} &middot;{' '}
          {serverInfo?.version || ''}
        </span>
      )}
    </div>
  );
}

function ActivityPulseWrapper({ children }: { children: React.ReactNode }) {
  const controls = useAnimationControls();
  const { subscribeToNewActivity } = useActivityStream();

  useEffect(() => {
    const unsubscribe = subscribeToNewActivity(() => {
      controls.start({
        scale: [1, 1.02, 1],
        opacity: [1, 0.85, 1],
        transition: { duration: 0.2, ease: [0.165, 0.84, 0.44, 1] },
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
        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No recent activity. Transactions will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-foreground">Recent activity</h2>
        <span className="text-xs text-muted-foreground">Live</span>
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

function ActivityCompactList() {
  const { activities, isVisible } = useActivityStream();

  if (!isVisible || activities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No recent activity</p>
    );
  }

  return (
    <div className="space-y-1">
      {activities.slice(0, 5).map((activity) => (
        <div key={activity.id} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">
            {formatRelativeTime(activity.timestamp)}
          </span>
          {activity.txid ? (
            <Link
              href={`/tx/${activity.txid}`}
              className="text-foreground hover:text-primary transition-colors duration-150 truncate"
            >
              {activity.description}
            </Link>
          ) : (
            <span className="text-foreground truncate">{activity.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ActivityTicker() {
  const { activities } = useActivityStream();

  if (activities.length === 0) return null;

  const latest = activities[0];

  return (
    <motion.div
      key={latest.id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex items-center gap-2 text-sm rounded-lg bg-accent/50 border border-border px-3 py-2"
    >
      <Activity className="h-3.5 w-3.5 text-accent-foreground shrink-0" />
      <span className="text-foreground truncate">{latest.description}</span>
      {latest.txid && (
        <Link
          href={`/tx/${latest.txid}`}
          className="text-primary hover:text-primary/80 text-xs shrink-0 transition-colors duration-150"
        >
          View
        </Link>
      )}
    </motion.div>
  );
}

const FEATURE_CARDS = [
  {
    title: 'Commitment transactions',
    description:
      'Periodically settled on-chain, commitment transactions anchor virtual UTXOs to the bitcoin blockchain. Browse and inspect each one.',
    icon: Layers,
    href: EXTERNAL_LINKS.DOCS,
  },
  {
    title: 'Arkade transactions',
    description:
      'Off-chain Arkade transactions enable instant, low-cost transfers. Explore the transaction graph between participants.',
    icon: GitBranch,
    href: EXTERNAL_LINKS.DOCS,
  },
  {
    title: 'VTXOs',
    description:
      'Virtual transaction outputs (VTXOs) represent spendable coins in the Arkade protocol. Track their creation, spending, and expiry.',
    icon: Coins,
    href: EXTERNAL_LINKS.DOCS,
  },
];

function FeatureCards() {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {FEATURE_CARDS.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.a
            key={card.title}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.08 * i }}
            className="group rounded-xl border border-border bg-card p-5 hover:bg-secondary/40 transition-colors duration-200 active:scale-[0.97] shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]"
          >
            <Icon className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
            <h3 className="font-heading text-sm font-semibold text-foreground mb-1.5">
              {card.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {card.description}
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:gap-1.5 transition-all duration-200">
              Learn more <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </motion.a>
        );
      })}
    </div>
  );
}

export function HomePageClient() {
  const { structure, preferences } = useStructure();
  const { serverInfo, isLoading } = useServerInfo();

  const stats = [
    {
      label: 'Network',
      value: serverInfo?.network || '--',
      icon: GitBranch,
    },
    {
      label: 'Session duration',
      value: serverInfo?.sessionDuration ? `${serverInfo.sessionDuration}s` : '--',
      icon: Clock,
    },
    {
      label: 'Unilateral exit delay',
      value: serverInfo?.unilateralExitDelay ? `${serverInfo.unilateralExitDelay} blocks` : '--',
      icon: Layers,
    },
    {
      label: 'Version',
      value: serverInfo?.version || '--',
      icon: Coins,
    },
  ];

  // Search variant — delegated to shared SearchBar component
  const renderSearch = () => {
    return <SearchBar variant={preferences.searchVariant} />;
  };

  // Stats variant — delegated to shared StatsPanel component
  const renderStats = () => {
    return <StatsPanel stats={stats} isLoading={isLoading} variant={preferences.statVariant} />;
  };

  // Determine activity variant
  const renderActivity = () => {
    const content = (() => {
      switch (preferences.activityVariant) {
        case 'feed':
          return <ActivityFeed />;
        case 'compact-list':
          return <ActivityCompactList />;
        case 'ticker':
          return <ActivityTicker />;
        case 'hidden':
          return null;
        default:
          return <ActivityFeed />;
      }
    })();

    if (!content) return null;

    return <ActivityPulseWrapper>{content}</ActivityPulseWrapper>;
  };

  // Blocks horizon structure: show block timeline as primary content
  if (structure === 'blocks-horizon') {
    return (
      <PageTransition>
        <div className="space-y-8">
          {renderSearch()}
          {renderStats()}
          <BlockTimeline />
          <FeatureCards />
        </div>
      </PageTransition>
    );
  }

  // Blocks split: mempool.space-style split view
  if (structure === 'blocks-split') {
    return (
      <PageTransition>
        <BlocksSplitHome />
      </PageTransition>
    );
  }

  // Blocks tabs: tabbed settled/mempool view
  if (structure === 'blocks-tabs') {
    return (
      <PageTransition>
        <BlocksTabsHome />
      </PageTransition>
    );
  }

  // Blocks timeline: vertical timeline with pending at top
  if (structure === 'blocks-timeline') {
    return (
      <PageTransition>
        <BlocksTimelineHome />
      </PageTransition>
    );
  }

  // Terminal structure: show terminal view
  if (structure === 'terminal') {
    return <TerminalView />;
  }

  // Sidebar structure: show welcome/empty state (sidebar handles its own layout)
  if (structure === 'sidebar') {
    return <SidebarWelcome />;
  }

  // Kanban structure: show VTXO lifecycle board
  if (structure === 'kanban') {
    return (
      <PageTransition>
        <div className="space-y-6">
          {renderStats()}
          <KanbanBoard />
        </div>
      </PageTransition>
    );
  }

  // Treemap structure: show proportional rectangles
  if (structure === 'treemap') {
    return (
      <PageTransition>
        <TreemapView />
      </PageTransition>
    );
  }

  // Explorer structure: show commitment blocks grid as primary content
  if (structure === 'explorer') {
    return (
      <PageTransition>
        <div className="space-y-8">
          {renderSearch()}
          {renderStats()}
          <CommitmentBlocks />
          <FeatureCards />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {renderSearch()}
        {renderStats()}

        <div className="space-y-6">
          {renderActivity()}
          <FeatureCards />

          <div className="text-center py-4">
            <a
              href={EXTERNAL_LINKS.DOCS}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors duration-200 active:scale-[0.97]"
              aria-label="Learn more about Arkade (opens in new tab)"
            >
              Learn more about Arkade
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
