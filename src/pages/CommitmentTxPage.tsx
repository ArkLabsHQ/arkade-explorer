import { useEffect } from 'react';
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['commitment-tx', txid],
    queryFn: async () => {
      if (!txid) throw new Error('No txid provided');
      return await indexerClient.getCommitmentTx(txid);
    },
    enabled: !!txid,
  });

  // Add to recent searches when page loads
  useEffect(() => {
    if (txid) {
      addRecentSearch(txid, 'commitment-tx');
    }
  }, [txid, addRecentSearch]);

  if (!txid) {
    return <ErrorMessage message="No transaction ID provided" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Failed to load commitment transaction: ${error.message}`} />;
  }

  return (
    <div className="space-y-6">
      <TransactionDetails 
        txid={txid}
        data={data}
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
