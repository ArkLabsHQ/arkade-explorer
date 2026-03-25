'use client';

import { motion } from 'framer-motion';
import { useStructure } from '@/hooks/use-structure';
import { cn } from '@/lib/utils';
import type { StatVariant } from '@/structures';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface StatsPanelProps {
  stats: StatItem[];
  isLoading?: boolean;
  variant?: StatVariant;
  className?: string;
}

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton({ width = 'w-16' }: { width?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted rounded h-5', width)} />
  );
}

// ---------------------------------------------------------------------------
// Grid variant (2x2 or 4-column grid of stat cards)
// ---------------------------------------------------------------------------

function StatsGrid({ stats, isLoading, className }: { stats: StatItem[]; isLoading?: boolean; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
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
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {Icon && <Icon className="h-4 w-4" />}
              <span className="text-xs font-medium uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-lg font-heading font-semibold text-foreground">
              {isLoading ? <LoadingSkeleton /> : stat.value}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-row variant (single row with label: value pairs separated by dots)
// ---------------------------------------------------------------------------

function StatsInlineRow({ stats, isLoading, className }: { stats: StatItem[]; isLoading?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 text-sm', className)}>
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-2">
          <span className="text-muted-foreground">{stat.label}:</span>
          {isLoading ? (
            <LoadingSkeleton width="w-12" />
          ) : (
            <span className="font-medium text-foreground">{stat.value}</span>
          )}
          {i < stats.length - 1 && (
            <span className="text-muted-foreground/50 ml-4 hidden sm:inline">&middot;</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar-compact variant (vertical list of label-value pairs)
// ---------------------------------------------------------------------------

function StatsSidebarCompact({ stats, isLoading, className }: { stats: StatItem[]; isLoading?: boolean; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]', className)}>
      <div className="space-y-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="text-xs font-medium truncate">{stat.label}</span>
              </div>
              {isLoading ? (
                <LoadingSkeleton width="w-14" />
              ) : (
                <span className="text-sm font-medium text-foreground shrink-0">{stat.value}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal variant (just values in a minimal inline display)
// ---------------------------------------------------------------------------

function StatsMinimal({ stats, isLoading, className }: { stats: StatItem[]; isLoading?: boolean; className?: string }) {
  return (
    <div className={cn('text-center text-sm text-muted-foreground', className)}>
      {isLoading ? (
        <div className="flex justify-center">
          <LoadingSkeleton width="w-48" />
        </div>
      ) : (
        <span>
          {stats.map((stat, i) => (
            <span key={stat.label}>
              {stat.value}
              {i < stats.length - 1 && ' \u00B7 '}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (variant-aware)
// ---------------------------------------------------------------------------

export function StatsPanel({ stats, isLoading, variant: overrideVariant, className }: StatsPanelProps) {
  const { preferences } = useStructure();
  const variant = overrideVariant ?? preferences.statVariant;

  if (stats.length === 0) return null;

  switch (variant) {
    case 'grid':
      return <StatsGrid stats={stats} isLoading={isLoading} className={className} />;
    case 'inline-row':
      return <StatsInlineRow stats={stats} isLoading={isLoading} className={className} />;
    case 'sidebar-compact':
      return <StatsSidebarCompact stats={stats} isLoading={isLoading} className={className} />;
    case 'minimal':
      return <StatsMinimal stats={stats} isLoading={isLoading} className={className} />;
    default:
      return <StatsGrid stats={stats} isLoading={isLoading} className={className} />;
  }
}
