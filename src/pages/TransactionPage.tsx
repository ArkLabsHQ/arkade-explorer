import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as btc from '@scure/btc-signer';
import { indexerClient } from '../lib/api/indexer';
import { TransactionDetails } from '../components/Transaction/TransactionDetails';
import { TransactionHex } from '../components/Transaction/TransactionHex';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { useRecentSearches } from '../hooks/useRecentSearches';

export function TransactionPage() {
  const { txid } = useParams<{ txid: string }>();
  const navigate = useNavigate();
  const { addRecentSearch } = useRecentSearches();
  const [txType, setTxType] = useState<'commitment' | 'arkade' | null>(null);

  // Try to fetch as commitment tx first
  const { data: commitmentData, isLoading: isLoadingCommitment, error: commitmentError } = useQuery({
    queryKey: ['commitment-tx', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getCommitmentTx(txid);
    },
    enabled: !!txid && txType === null,
    retry: false,
  });

  // If not a commitment tx, try to fetch as virtual/arkade tx
  const { data: virtualTxData, isLoading: isLoadingVirtual, error: virtualError } = useQuery({
    queryKey: ['virtual-tx', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getVirtualTxs([txid]);
    },
    enabled: !!txid && txType === 'arkade',
    retry: false,
  });

  // Build outpoints for VTXO query (we need to get VTXO data for each output to get timestamps)
  const outputOutpoints = useMemo(() => {
    if (!txid || !virtualTxData?.txs?.[0]) return [];
    try {
      const psbtBase64 = virtualTxData.txs[0];
      const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
      const parsedTx = btc.Transaction.fromPSBT(psbtBytes);
      return Array.from({ length: parsedTx.outputsLength }).map((_, vout) => ({
        txid,
        vout,
      }));
    } catch (e) {
      console.error('Failed to parse PSBT for outpoints:', e);
      return [];
    }
  }, [txid, virtualTxData]);

  // Fetch VTXO data for the transaction outputs to get timestamps
  const { data: vtxoData } = useQuery({
    queryKey: ['tx-vtxos', txid, outputOutpoints],
    queryFn: async () => {
      if (outputOutpoints.length === 0) return { vtxos: [] };
      return await indexerClient.getVtxos({ outpoints: outputOutpoints });
    },
    enabled: outputOutpoints.length > 0 && txType === 'arkade',
  });

  useEffect(() => {
    if (commitmentData) {
      setTxType('commitment');
      // Redirect to commitment-tx route
      navigate(`/commitment-tx/${txid}`, { replace: true });
    } else if (commitmentError) {
      // If it's not a commitment tx, try as arkade tx
      setTxType('arkade');
    }
  }, [commitmentData, commitmentError, txid, navigate]);

  // Add to recent searches when page loads
  useEffect(() => {
    if (txid && txType === 'arkade') {
      addRecentSearch(txid, 'transaction');
    }
  }, [txid, txType, addRecentSearch]);

  if (!txid) {
    return <ErrorMessage message="No transaction ID provided" />;
  }

  if (isLoadingCommitment || (txType === null)) {
    return <LoadingSpinner />;
  }

  if (txType === 'arkade') {
    if (isLoadingVirtual) {
      return <LoadingSpinner />;
    }

    if (virtualError) {
      return <ErrorMessage message={`Transaction not found: ${virtualError.message}`} />;
    }

    const txHex = virtualTxData?.txs?.[0];

    return (
      <div className="space-y-6">
        <TransactionDetails txid={txid} type="arkade" data={virtualTxData} vtxoData={vtxoData?.vtxos} />
        {txHex && <TransactionHex txHex={txHex} label="Virtual Transaction Hex" />}
      </div>
    );
  }

  return null;
}
