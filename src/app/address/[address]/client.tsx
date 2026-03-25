'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Copy, Check, Pin, PinOff } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { VirtualCoin } from '@arkade-os/sdk';
import { indexerClient } from '@/lib/api/indexer';
import { addressToScriptHex } from '@/lib/decode';
import { PAGINATION } from '@/lib/constants';
import { copyToClipboard, cn } from '@/lib/utils';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { MoneyDisplay } from '@/components/shared/money-display';
import { VtxoList } from '@/components/shared/vtxo-list';
import { AddressStats } from '@/components/shared/address-stats';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ErrorMessage } from '@/components/shared/error-message';
import { PageTransition } from '@/components/shared/page-transition';

type VtxoFilter = 'all' | 'spendable' | 'recoverable' | 'spent';
type StatusFilter = 'all' | 'preconfirmed' | 'settled';

interface AddressPageClientProps {
  address: string;
}

function CopyableValue({ value, truncate }: { value: string; truncate?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-foreground font-mono text-xs break-all">
        {truncate && value.length > 20
          ? `${value.slice(0, 12)}...${value.slice(-12)}`
          : value}
      </span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
        title="Copy to clipboard"
        aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

const FILTER_BUTTONS: { value: VtxoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'spendable', label: 'Spendable' },
  { value: 'recoverable', label: 'Recoverable' },
  { value: 'spent', label: 'Spent' },
];

const STATUS_BUTTONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'preconfirmed', label: 'Preconfirmed' },
  { value: 'settled', label: 'Settled' },
];

export function AddressPageClient({ address }: AddressPageClientProps) {
  const [vtxoFilter, setVtxoFilter] = useState<VtxoFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { addRecentSearch, isPinned, pinSearch, unpinSearch } = useRecentSearches();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<AbortController | null>(null);

  // Compute script hex from address
  const scriptHex = useMemo(() => {
    try {
      return addressToScriptHex(address);
    } catch {
      return null;
    }
  }, [address]);

  // Add to recent searches on mount
  useEffect(() => {
    addRecentSearch(address, 'address');
  }, [address, addRecentSearch]);

  // Fetch VTXOs with infinite query
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['address-vtxos', scriptHex, vtxoFilter],
    queryFn: async ({ pageParam = 0 }) => {
      if (!scriptHex) throw new Error('Invalid address');

      const opts: Parameters<typeof indexerClient.getVtxos>[0] = {
        scripts: [scriptHex],
        pageIndex: pageParam,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      };

      if (vtxoFilter === 'spendable') opts.spendableOnly = true;
      if (vtxoFilter === 'spent') opts.spentOnly = true;
      if (vtxoFilter === 'recoverable') opts.recoverableOnly = true;

      return indexerClient.getVtxos(opts);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.page) return undefined;
      const { next, current, total } = lastPage.page;
      if (next <= current) return undefined;
      if (total > 0 && current >= total - 1) return undefined;
      return next;
    },
    initialPageParam: 0,
    enabled: !!scriptHex,
  });

  // Subscribe for real-time updates
  useEffect(() => {
    if (!scriptHex) return;

    const abortController = new AbortController();
    subscriptionRef.current = abortController;

    async function subscribe() {
      try {
        const subscriptionId = await indexerClient.subscribeForScripts([scriptHex!]);

        const subscription = indexerClient.getSubscription(
          subscriptionId,
          abortController.signal,
        );

        for await (const _event of subscription) {
          if (abortController.signal.aborted) break;
          // Refetch VTXOs when we get an update
          refetch();
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Subscription error:', err);
        }
      }
    }

    subscribe();

    return () => {
      abortController.abort();
      subscriptionRef.current = null;
    };
  }, [scriptHex, refetch]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages of VTXOs
  const allVtxos = useMemo(
    () => data?.pages.flatMap((page) => page.vtxos) ?? [],
    [data],
  );

  // Apply status filter client-side
  const filteredVtxos = useMemo(() => {
    if (statusFilter === 'all') return allVtxos;
    return allVtxos.filter(
      (vtxo) => vtxo.virtualStatus.state === statusFilter,
    );
  }, [allVtxos, statusFilter]);

  // Compute filtered balance
  const filteredBalance = useMemo(
    () => filteredVtxos.reduce((sum, vtxo) => sum + vtxo.value, 0),
    [filteredVtxos],
  );

  const pinned = isPinned(address);

  const handleTogglePin = useCallback(() => {
    if (pinned) {
      unpinSearch(address);
    } else {
      pinSearch(address, 'address');
    }
  }, [pinned, address, pinSearch, unpinSearch]);

  if (!scriptHex) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <ErrorMessage message="Invalid address. Could not decode the provided address." />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <Breadcrumb />

      {/* Address details card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-xl font-bold text-foreground">
            Address details
          </h1>
          <button
            onClick={handleTogglePin}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors duration-150',
              pinned
                ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                : 'text-muted-foreground border-border hover:text-foreground hover:border-foreground/20',
            )}
            title={pinned ? 'Unpin address' : 'Pin address'}
            aria-label={pinned ? 'Unpin this address' : 'Pin this address'}
            aria-pressed={pinned}
          >
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {pinned ? 'Unpin' : 'Pin'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
              Address
            </label>
            <CopyableValue value={address} />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
              Script hex
            </label>
            <CopyableValue value={scriptHex} truncate />
          </div>
        </div>
      </div>

      {/* Address stats */}
      {!isLoading && !error && allVtxos.length > 0 && (
        <AddressStats vtxos={allVtxos} />
      )}

      {/* Filter controls */}
      <div className="space-y-3">
        {/* VTXO type filter */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mr-1">
            Type
          </span>
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setVtxoFilter(btn.value)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg transition-colors duration-150',
                vtxoFilter === btn.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground border border-border hover:text-foreground',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mr-1">
            Status
          </span>
          {STATUS_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg transition-colors duration-150',
                statusFilter === btn.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground border border-border hover:text-foreground',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Balance summary */}
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Balance
        </h2>
        <MoneyDisplay
          sats={filteredBalance}
          className="text-foreground font-mono text-sm"
        />
        <span className="text-xs text-muted-foreground">
          ({filteredVtxos.length} VTXO{filteredVtxos.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* VTXO list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage
          message={
            error instanceof Error
              ? error.message
              : 'Failed to fetch VTXOs'
          }
        />
      ) : (
        <>
          <VtxoList vtxos={filteredVtxos} />

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-1" />

          {isFetchingNextPage && <LoadingSpinner />}

          {!hasNextPage && filteredVtxos.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              All VTXOs loaded
            </p>
          )}
        </>
      )}
    </div>
    </PageTransition>
  );
}

function Breadcrumb() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        Home
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="text-sm text-foreground">Address</span>
    </div>
  );
}
