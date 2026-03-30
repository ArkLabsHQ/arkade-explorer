import { useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as btc from '@scure/btc-signer';
import { indexerClient } from '@/lib/api/indexer';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { TransactionDetail } from '@/components/shared/transaction-detail';
import { PageTransition } from '@/components/shared/page-transition';

type TxType = 'arkade' | 'commitment' | null;

export function TransactionPage() {
  const { txid } = useParams<{ txid: string }>();
  const navigate = useNavigate();
  const { addRecentSearch } = useRecentSearches();
  const [txType, setTxType] = useState<TxType>(null);
  const addedToRecentRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = txid ? `Tx ${txid.slice(0, 8)}... | Arkade Explorer` : 'Arkade Explorer';
    return () => { document.title = 'Arkade Explorer'; };
  }, [txid]);

  // Reset txType when txid changes
  useEffect(() => {
    setTxType(null);
  }, [txid]);

  // Try to fetch as virtual/arkade tx first
  const { data: virtualTxData, isLoading: isLoadingVirtual, error: virtualError } = useQuery({
    queryKey: ['virtual-tx', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getVirtualTxs([txid]);
    },
    enabled: !!txid && txType === null,
    retry: false,
  });

  // Build outpoints for all non-anchor outputs of the current transaction
  const psbtBase64 = virtualTxData?.txs?.[0];

  const currentTxOutpoints = useMemo(() => {
    if (!txid || !psbtBase64) return [];
    try {
      const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
      const parsedTx = btc.Transaction.fromPSBT(psbtBytes);

      const outpoints = [];
      for (let vout = 0; vout < parsedTx.outputsLength; vout++) {
        const output = parsedTx.getOutput(vout);
        const scriptHex = output?.script
          ? Array.from(output.script).map(b => b.toString(16).padStart(2, '0')).join('')
          : '';
        const isAnchor = scriptHex.startsWith('51024e73');
        const isArkExtension = scriptHex.startsWith('6a') && (() => {
          try {
            const decoded = btc.Script.decode(output!.script!);
            if (decoded.length < 2 || decoded[0] !== 'RETURN') return false;
            const data = decoded[1];
            return data instanceof Uint8Array && data.length >= 3 && data[0] === 0x41 && data[1] === 0x52 && data[2] === 0x4b;
          } catch { return false; }
        })();

        if (!isAnchor && !isArkExtension) {
          outpoints.push({ txid, vout });
        }
      }
      return outpoints;
    } catch {
      return [];
    }
  }, [txid, psbtBase64]);

  // Fetch VTXO data for all non-anchor outputs
  const outpointsKey = JSON.stringify(currentTxOutpoints);

  const { data: vtxoData } = useQuery({
    queryKey: ['tx-vtxos', txid, outpointsKey],
    queryFn: async () => {
      if (currentTxOutpoints.length === 0) return { vtxos: [] };
      return await indexerClient.getVtxos({ outpoints: currentTxOutpoints });
    },
    enabled: currentTxOutpoints.length > 0 && txType === 'arkade',
  });

  // Virtual tx not found: either errored or returned empty data
  const virtualTxNotFound = !!virtualError || (!isLoadingVirtual && !!virtualTxData && !virtualTxData.txs?.[0]);

  // Fallback: try fetching as commitment tx if virtual tx not found
  const { data: commitmentData, isLoading: isLoadingCommitment } = useQuery({
    queryKey: ['commitment-tx-check', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getCommitmentTx(txid);
    },
    enabled: !!txid && virtualTxNotFound,
    retry: false,
  });

  // Determine transaction type based on virtual tx data
  useEffect(() => {
    if (virtualTxData?.txs?.[0]) {
      const txData = virtualTxData.txs[0];
      // Hex (commitment tx) only contains 0-9, a-f; base64 has +, /, =
      const isHex = /^[0-9a-fA-F]+$/.test(txData);

      if (isHex) {
        setTxType('commitment');
        navigate(`/commitment-tx/${txid}`, { replace: true });
      } else {
        setTxType('arkade');
      }
    } else if (virtualTxNotFound) {
      if (commitmentData) {
        navigate(`/commitment-tx/${txid}`, { replace: true });
      } else if (!isLoadingCommitment) {
        setTxType('arkade');
      }
    }
  }, [virtualTxData, virtualTxNotFound, commitmentData, isLoadingCommitment, txid, navigate]);

  // Add to recent searches when page loads
  useLayoutEffect(() => {
    if (txid && txType === 'arkade') {
      const key = `${txid}-${txType}`;
      if (addedToRecentRef.current !== key) {
        addedToRecentRef.current = key;
        setTimeout(() => {
          addRecentSearch(txid, 'transaction');
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txid, txType]);

  if (!txid) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">No transaction ID provided</p>
        </div>
      </div>
    );
  }

  // Show loading while determining transaction type
  if (isLoadingVirtual || isLoadingCommitment || txType === null) {
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

  if (txType === 'arkade') {
    if (virtualError) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Home</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-foreground">Transaction</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Transaction not found</p>
              <p className="text-xs text-muted-foreground break-all">{virtualError.message}</p>
              <p className="text-xs text-muted-foreground font-mono mt-2 break-all">{txid}</p>
            </div>
          </div>
        </div>
      );
    }

    const txHex = virtualTxData?.txs?.[0] || '';

    return (
      <PageTransition>
        <TransactionDetail
          type="arkade"
          arkadeData={{ txid, hex: txHex }}
          vtxoData={vtxoData?.vtxos}
        />
      </PageTransition>
    );
  }

  return null;
}
