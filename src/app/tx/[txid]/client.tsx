'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { indexerClient } from '@/lib/api/indexer';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { TransactionDetail } from '@/components/shared/transaction-detail';
import { PageTransition } from '@/components/shared/page-transition';

type TxType = 'arkade' | 'commitment' | 'loading' | 'error';

interface TransactionPageClientProps {
  txid: string;
}

export function TransactionPageClient({ txid }: TransactionPageClientProps) {
  const router = useRouter();
  const { addRecentSearch } = useRecentSearches();

  const [txType, setTxType] = useState<TxType>('loading');
  const [hex, setHex] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function determineTxType() {
      setTxType('loading');
      setError(null);

      try {
        // Try fetching as commitment tx first
        const commitmentTx = await indexerClient.getCommitmentTx(txid).catch(() => null);

        if (cancelled) return;

        if (commitmentTx && commitmentTx.batches && Object.keys(commitmentTx.batches).length > 0) {
          // This is a commitment tx, redirect to the commitment-tx page
          addRecentSearch(txid, 'commitment-tx');
          router.replace(`/commitment-tx/${txid}`);
          return;
        }

        // Otherwise, treat as an arkade virtual transaction
        const virtualTxResult = await indexerClient.getVirtualTxs([txid]).catch(() => null);

        if (cancelled) return;

        if (virtualTxResult?.txs && virtualTxResult.txs.length > 0) {
          setHex(virtualTxResult.txs[0]);
          setTxType('arkade');
          addRecentSearch(txid, 'transaction');
        } else {
          // Could not find it as either type, still show what we can
          setTxType('arkade');
          setHex('');
          addRecentSearch(txid, 'transaction');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to determine tx type:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transaction');
        setTxType('error');
      }
    }

    determineTxType();
    return () => {
      cancelled = true;
    };
  }, [txid, router, addRecentSearch]);

  // Loading state
  if (txType === 'loading') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-10 bg-muted rounded animate-pulse" />
          <span className="text-muted-foreground">/</span>
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Determining transaction type...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (txType === 'error') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Home
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground">Transaction</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Failed to load transaction</p>
            <p className="text-xs text-muted-foreground break-all">{error}</p>
            <p className="text-xs text-muted-foreground font-mono mt-2 break-all">{txid}</p>
          </div>
        </div>
      </div>
    );
  }

  // Arkade tx
  return (
    <PageTransition>
      <TransactionDetail
        type="arkade"
        arkadeData={{
          txid,
          hex,
        }}
      />
    </PageTransition>
  );
}
