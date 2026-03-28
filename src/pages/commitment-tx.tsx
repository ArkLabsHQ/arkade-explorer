import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { indexerClient } from '@/lib/api/indexer';
import { fetchAllPages } from '@/lib/api/fetchAllPages';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { TransactionDetail } from '@/components/shared/transaction-detail';
import { BatchList } from '@/components/shared/batch-list';
import { PageTransition } from '@/components/shared/page-transition';
import type { CommitmentTx, Tx } from '@arkade-os/sdk';

type LoadState = 'loading' | 'loaded' | 'error';

export function CommitmentTxPage() {
  const { txid } = useParams<{ txid: string }>();
  const { addRecentSearch } = useRecentSearches();

  const [state, setState] = useState<LoadState>('loading');
  const [metadata, setMetadata] = useState<CommitmentTx | null>(null);
  const [hex, setHex] = useState('');
  const [forfeitTxids, setForfeitTxids] = useState<string[]>([]);
  const [connectors, setConnectors] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txid) return;
    let cancelled = false;

    async function loadCommitmentTx() {
      setState('loading');
      setError(null);

      try {
        const [commitmentTx, virtualTxResult, forfeitResult, connectorsResult] = await Promise.all([
          indexerClient.getCommitmentTx(txid!),
          indexerClient.getVirtualTxs([txid!]).catch(() => ({ txs: [] })),
          fetchAllPages(
            (opts) => indexerClient.getCommitmentTxForfeitTxs(txid!, opts),
            'txids',
          ).catch(() => ({ txids: [] })),
          fetchAllPages(
            (opts) => indexerClient.getCommitmentTxConnectors(txid!, opts),
            'connectors',
          ).catch(() => ({ connectors: [] })),
        ]);

        if (cancelled) return;

        setMetadata(commitmentTx);
        setHex(virtualTxResult.txs?.[0] || '');
        setForfeitTxids(forfeitResult.txids || []);
        setConnectors(connectorsResult.connectors || []);
        setState('loaded');
        addRecentSearch(txid!, 'commitment-tx');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load commitment tx:', err);
        setError(err instanceof Error ? err.message : 'Failed to load commitment transaction');
        setState('error');
      }
    }

    loadCommitmentTx();
    return () => {
      cancelled = true;
    };
  }, [txid, addRecentSearch]);

  if (state === 'loading') {
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

  if (state === 'error') {
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
            <p className="text-xs text-muted-foreground break-all">{error}</p>
            <p className="text-xs text-muted-foreground font-mono mt-2 break-all">{txid}</p>
          </div>
        </div>
      </div>
    );
  }

  const batchEntries = metadata?.batches
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
            txid: txid!,
            metadata: metadata!,
            hex,
            forfeitTxids,
            connectors,
          }}
        />
        <BatchList batches={batchEntries} />
      </div>
    </PageTransition>
  );
}
