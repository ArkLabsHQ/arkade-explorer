import { useLayoutEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexerClient } from '../lib/api/indexer';
import { TransactionDetails } from '../components/Transaction/TransactionDetails';
import { BatchList } from '../components/Transaction/BatchList';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { useRecentSearches } from '../hooks/useRecentSearches';

export function CommitmentTxPage() {
  const { txid } = useParams<{ txid: string }>();
  const { addRecentSearch } = useRecentSearches();
  const addedToRecentRef = useRef<string | null>(null);

  // Fetch commitment transaction metadata
  const { data, isLoading, error } = useQuery({
    queryKey: ['commitment-tx', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getCommitmentTx(txid);
    },
    enabled: !!txid,
  });

  // Fetch virtual tx to get raw transaction hex
  const { data: virtualTxData } = useQuery({
    queryKey: ['virtual-tx', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getVirtualTxs([txid]);
    },
    enabled: !!txid,
  });

  // Fetch forfeit transactions for this commitment tx
  const { data: forfeitTxsData } = useQuery({
    queryKey: ['commitment-forfeit-txs', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getCommitmentTxForfeitTxs(txid);
    },
    enabled: !!txid,
  });

  // Fetch connector transactions for this commitment tx
  const { data: connectorsData } = useQuery({
    queryKey: ['commitment-connectors', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getCommitmentTxConnectors(txid);
    },
    enabled: !!txid,
  });

  // Add to recent searches when page loads
  useLayoutEffect(() => {
    if (txid && addedToRecentRef.current !== txid) {
      addedToRecentRef.current = txid;
      setTimeout(() => {
        addRecentSearch(txid, 'commitment-tx');
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txid]);

  if (!txid) {
    return <ErrorMessage message="No transaction ID provided" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Failed to load commitment transaction: ${error.message}`} />;
  }

  // Merge commitment metadata with virtual tx hex, forfeit txs, and connectors
  const commitmentDataWithTx = data && virtualTxData?.txs?.[0] 
    ? { 
        ...data, 
        tx: virtualTxData.txs[0],
        forfeitTxids: forfeitTxsData?.txids || [],
        connectors: connectorsData?.connectors || []
      }
    : data;

  return (
    <div className="space-y-6">
      <TransactionDetails 
        txid={txid}
        data={commitmentDataWithTx}
        type="commitment"
      />
      
      {data?.batches && Object.keys(data.batches).length > 0 && (
        <BatchList 
          commitmentTxid={txid}
          batches={data.batches}
        />
      )}
    </div>
  );
}
