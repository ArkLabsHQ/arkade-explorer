import { useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
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
  const addedToRecentRef = useRef<string | null>(null);

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
  // Use the PSBT string itself as dependency to avoid re-computing when virtualTxData object changes
  const psbtBase64 = virtualTxData?.txs?.[0];
  
  const currentTxOutpoints = useMemo(() => {
    if (!txid || !psbtBase64) return [];
    try {
      const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
      const parsedTx = btc.Transaction.fromPSBT(psbtBytes);
      
      // Get all outputs and filter out anchors
      const outpoints = [];
      for (let vout = 0; vout < parsedTx.outputsLength; vout++) {
        const output = parsedTx.getOutput(vout);
        const scriptHex = output?.script 
          ? Array.from(output.script).map(b => b.toString(16).padStart(2, '0')).join('')
          : '';
        const isAnchor = scriptHex.startsWith('51024e73');
        
        if (!isAnchor) {
          outpoints.push({ txid, vout });
        }
      }
      return outpoints;
    } catch (e) {
      // Silently fail - not all transactions have valid PSBTs
      return [];
    }
  }, [txid, psbtBase64]);

  // Fetch VTXO data for all non-anchor outputs
  // Serialize outpoints for stable query key
  const outpointsKey = JSON.stringify(currentTxOutpoints);
  
  const { data: vtxoData } = useQuery({
    queryKey: ['tx-vtxos', txid, outpointsKey],
    queryFn: async () => {
      console.log('[TransactionPage] Fetching VTXOs by outpoints:', currentTxOutpoints);
      console.trace('[TransactionPage] Stack trace for VTXO fetch');
      if (currentTxOutpoints.length === 0) return { vtxos: [] };
      return await indexerClient.getVtxos({ outpoints: currentTxOutpoints });
    },
    enabled: currentTxOutpoints.length > 0 && txType === 'arkade',
  });

  // Determine transaction type based on virtual tx data
  useEffect(() => {
    if (virtualTxData?.txs?.[0]) {
      const txData = virtualTxData.txs[0];
      
      // Check if it's hex (commitment tx) or base64 (arkade PSBT)
      // Hex will only contain characters 0-9, a-f, A-F
      // Base64 contains +, /, = and other characters
      const isHex = /^[0-9a-fA-F]+$/.test(txData);
      
      if (isHex) {
        // It's a commitment transaction - redirect to commitment-tx route
        setTxType('commitment');
        navigate(`/commitment-tx/${txid}`, { replace: true });
      } else {
        // It's an arkade transaction (PSBT in base64)
        setTxType('arkade');
      }
    } else if (virtualError) {
      // Virtual tx not found - could still be a commitment tx, but unlikely
      // For now, show error
      setTxType('arkade'); // Set to arkade to show the error
    }
  }, [virtualTxData, virtualError, txid, navigate]);

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
    return <ErrorMessage message="No transaction ID provided" />;
  }

  // Show loading while determining transaction type
  if (isLoadingVirtual || txType === null) {
    return <LoadingSpinner />;
  }

  // If it's a commitment tx, loading state is handled by redirect to /commitment-tx route
  // This component only handles arkade transactions now
  if (txType === 'arkade') {
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
