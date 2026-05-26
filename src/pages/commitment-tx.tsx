import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexerClient } from '@/lib/api/indexer';
import { fetchAllPages } from '@/lib/api/fetchAllPages';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { TransactionDetail } from '@/components/shared/transaction-detail';
import { BatchList } from '@/components/shared/batch-list';
import { PageTransition } from '@/components/shared/page-transition';

export function CommitmentTxPage() {
  const { txid } = useParams<{ txid: string }>();
  const { addRecentSearch } = useRecentSearches();
  const addedToRecentRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = txid ? `Commitment transaction ${txid.slice(0, 8)}... | Arkade Explorer` : 'Arkade Explorer';
    return () => { document.title = 'Arkade Explorer'; };
  }, [txid]);

  // Fetch commitment tx metadata
  const { data: metadata, isLoading: isLoadingMeta, error: metaError } = useQuery({
    queryKey: ['commitment-tx', txid],
    queryFn: () => indexerClient.getCommitmentTx(txid!),
    enabled: !!txid,
    retry: false,
  });

  // Fetch virtual tx hex
  const { data: virtualTxData } = useQuery({
    queryKey: ['virtual-tx', txid],
    queryFn: () => indexerClient.getVirtualTxs([txid!]),
    enabled: !!txid,
    retry: false,
  });

  // Fetch forfeit transaction IDs
  const { data: forfeitData } = useQuery({
    queryKey: ['commitment-tx-forfeits', txid],
    queryFn: () => fetchAllPages(
      (opts) => indexerClient.getCommitmentTxForfeitTxs(txid!, opts),
      'txids',
    ),
    enabled: !!txid && !!metadata,
  });

  // Fetch connector transactions
  const { data: connectorsData } = useQuery({
    queryKey: ['commitment-tx-connectors', txid],
    queryFn: () => fetchAllPages(
      (opts) => indexerClient.getCommitmentTxConnectors(txid!, opts),
      'connectors',
    ),
    enabled: !!txid && !!metadata,
  });

  // Add to recent searches
  useLayoutEffect(() => {
    if (txid && metadata && addedToRecentRef.current !== txid) {
      addedToRecentRef.current = txid;
      setTimeout(() => addRecentSearch(txid, 'commitment-tx'), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txid, metadata]);

  if (!txid) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">No transaction ID provided</p>
        </div>
      </div>
    );
  }

  if (isLoadingMeta) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-10 bg-muted rounded animate-pulse" />
          <span className="text-muted-foreground">/</span>
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Loading commitment transaction...</span>
          </div>
        </div>
      </div>
    );
  }

  if (metaError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Home</Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground">Commitment transaction</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Failed to load commitment transaction</p>
            <p className="text-xs text-muted-foreground break-all">{metaError instanceof Error ? metaError.message : 'Unknown error'}</p>
            <p className="text-xs text-muted-foreground font-mono mt-2 break-all">{txid}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  const txHex = virtualTxData?.txs?.[0] || '';
  const forfeitTxids = forfeitData?.txids || [];
  const connectors = connectorsData?.connectors || [];

  const batchEntries = metadata.batches
    ? Object.entries(metadata.batches).map(([outpoint, info]) => ({
        outpoint,
        info,
      }))
    : [];

  return (
    <PageTransition>
      <div className="space-y-8">
        <TransactionDetail
          type="commitment"
          commitmentData={{
            txid,
            metadata,
            hex: txHex,
            forfeitTxids,
            connectors,
          }}
        />
        <BatchList batches={batchEntries} />
      </div>
    </PageTransition>
  );
}
