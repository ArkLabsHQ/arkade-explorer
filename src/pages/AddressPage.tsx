import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexerClient, arkClient } from '../lib/api/indexer';
import { Card } from '../components/UI/Card';
import { VtxoList } from '../components/Address/VtxoList';
import { AddressStats } from '../components/Address/AddressStats';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { ParticleRain } from '../components/UI/ParticleRain';
import { truncateHash, copyToClipboard } from '../lib/utils';
import { addressToScriptHex, scriptHexToAddress, isHex } from '../lib/decode';
import { Copy, Check } from 'lucide-react';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useServerInfo } from '../contexts/ServerInfoContext';

export function AddressPage() {
  const { address } = useParams<{ address: string }>();
  const { addRecentSearch } = useRecentSearches();
  const { serverInfo } = useServerInfo();
  const [spendFilter, setSpendFilter] = useState<'all' | 'unspent' | 'spent'>('all');
  const [spendableFilter, setSpendableFilter] = useState<'all' | 'spendable' | 'recoverable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'preconfirmed' | 'settled'>('all');
  const [displayCount, setDisplayCount] = useState(20);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const itemsPerPage = 20;

  // Validate address exists
  if (!address) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <ErrorMessage message="No address provided" />
      </div>
    );
  }

  // Convert address/script and handle validation
  const addressInfo = useMemo(() => {
    try {
      const scriptHex = addressToScriptHex(address);
      const isScript = isHex(address);
      
      let displayAddress = address;
      // If a script was passed, convert it to an address for display
      if (isScript) {
        displayAddress = scriptHexToAddress(
          scriptHex,
          serverInfo?.signerPubkey,
          serverInfo?.network
        );
      }
      
      return { scriptHex, isScript, displayAddress, error: null };
    } catch (err) {
      return { scriptHex: '', isScript: false, displayAddress: address, error: err };
    }
  }, [address, serverInfo?.signerPubkey, serverInfo?.network]);

  if (addressInfo.error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <ErrorMessage message="Invalid address format" />
      </div>
    );
  }

  const { scriptHex, displayAddress } = addressInfo;

  const handleCopyAddress = () => {
    if (!displayAddress) return;
    copyToClipboard(displayAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyScript = () => {
    copyToClipboard(scriptHex);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['address-vtxos', address],
    queryFn: async () => {
      if (!address) throw new Error('No address provided');
      return await indexerClient.getVtxos({ scripts: [scriptHex] });
    },
    enabled: !!address && !!scriptHex,
  });

  // Subscribe to real-time updates for this address
  useEffect(() => {
    if (!address || !scriptHex) return;

    console.log('Subscribing to address updates:', address);
    const abortController = new AbortController();
    
    (async () => {
      try {
        // First, subscribe to get the subscription ID
        const subscriptionId = await indexerClient.subscribeForScripts([scriptHex]);
        console.log('Got subscription ID:', subscriptionId);
        
        if (abortController.signal.aborted) return;
        
        // Then use the subscription ID to listen to events
        const eventStream = indexerClient.getSubscription(subscriptionId, abortController.signal);
        
        for await (const event of eventStream) {
          if (abortController.signal.aborted) break;
          console.log('Address event received:', event);
          // Trigger particle rain animation
          setParticleTrigger(prev => prev + 1);
          // Refetch VTXOs when an event is received
          refetch();
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Event stream aborted');
        } else {
          console.error('Subscription error:', error);
        }
      }
    })();

    return () => {
      console.log('Unsubscribing from address updates');
      abortController.abort();
    };
  }, [address, scriptHex, refetch]);

  // Add to recent searches when page loads
  useEffect(() => {
    if (displayAddress) {
      addRecentSearch(displayAddress, 'address');
    }
  }, [displayAddress, addRecentSearch]);

  // Calculate derived values
  const allVtxos = data?.vtxos || [];
  let vtxos = allVtxos.filter(v => {
    const expireAt = (v as any).expireAt || (v as any).expiresAt;
    const isExpired = expireAt ? new Date(expireAt) < new Date() : false;
    const isRecoverable = !v.spentBy && isExpired;
    const isSpendable = !v.spentBy && !isExpired;
    const isPreconfirmed = (v as any).preconfirmed;
    const isSettled = (v as any).settledBy;
    
    // Apply spend filter
    if (spendFilter === 'unspent' && v.spentBy) return false;
    if (spendFilter === 'spent' && !v.spentBy) return false;
    
    // Apply spendable filter
    if (spendableFilter === 'spendable' && !isSpendable) return false;
    if (spendableFilter === 'recoverable' && !isRecoverable) return false;
    
    // Apply status filter
    if (statusFilter === 'preconfirmed' && !isPreconfirmed) return false;
    if (statusFilter === 'settled' && !isSettled) return false;
    
    return true;
  });

  // Infinite scroll - show only first N items
  const displayedVtxos = vtxos.slice(0, displayCount);
  const hasMore = displayCount < vtxos.length;

  // Reset display count when filters change
  const resetDisplayCount = () => {
    setDisplayCount(itemsPerPage);
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + itemsPerPage);
  };

  // Infinite scroll observer - MUST be before any returns
  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) return;

    const currentRef = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [hasMore]);

  if (!address) {
    return <ErrorMessage message="No address provided" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={`Failed to load address data: ${error.message}`} />;
  }

  return (
    <div className="space-y-6">
      <ParticleRain trigger={particleTrigger} />
      <Card glowing>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-arkade-purple uppercase">Address Details</h1>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
              <span className="text-arkade-gray uppercase text-sm font-bold">Address</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyAddress}
                  className="text-arkade-gray font-mono text-sm hover:text-arkade-purple transition-colors cursor-pointer"
                  title="Click to copy"
                >
                  {truncateHash(displayAddress, 16, 16)}
                </button>
                <button
                  onClick={handleCopyAddress}
                  className="p-1 hover:text-arkade-purple transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedAddress ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
              <span className="text-arkade-gray uppercase text-sm font-bold">Script Hex</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyScript}
                  className="text-arkade-gray font-mono text-sm hover:text-arkade-purple transition-colors cursor-pointer"
                  title="Click to copy"
                >
                  {truncateHash(scriptHex, 16, 16)}
                </button>
                <button
                  onClick={handleCopyScript}
                  className="p-1 hover:text-arkade-purple transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedScript ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AddressStats vtxos={allVtxos} />

      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-arkade-purple uppercase mb-4">VTXOs ({vtxos.length})</h2>
          
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {/* Spend Status Filter */}
            <div className="flex items-center space-x-2 md:space-x-1.5 w-full md:w-auto">
              <span className="text-arkade-gray text-xs uppercase font-bold flex-shrink-0 w-24 md:w-auto">Spend:</span>
              <div className="flex space-x-1 flex-1 md:flex-initial">
                <button
                  onClick={() => { setSpendFilter('all'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    spendFilter === 'all'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setSpendFilter('unspent'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    spendFilter === 'unspent'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  Unspent
                </button>
                <button
                  onClick={() => { setSpendFilter('spent'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    spendFilter === 'spent'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  Spent
                </button>
              </div>
            </div>

            <div className="hidden md:block h-6 w-px bg-arkade-purple"></div>

            {/* Spendable Filter */}
            <div className="flex items-center space-x-2 md:space-x-1.5 w-full md:w-auto">
              <span className="text-arkade-gray text-xs uppercase font-bold flex-shrink-0 w-24 md:w-auto">Spendable:</span>
              <div className="flex space-x-1 flex-1 md:flex-initial">
                <button
                  onClick={() => { setSpendableFilter('all'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    spendableFilter === 'all'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setSpendableFilter('spendable'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    spendableFilter === 'spendable'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  Spendable
                </button>
                <button
                  onClick={() => { setSpendableFilter('recoverable'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    spendableFilter === 'recoverable'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  Recoverable
                </button>
              </div>
            </div>

            <div className="hidden md:block h-6 w-px bg-arkade-purple"></div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2 md:space-x-1.5 w-full md:w-auto">
              <span className="text-arkade-gray text-xs uppercase font-bold flex-shrink-0 w-24 md:w-auto">Status:</span>
              <div className="flex space-x-1 flex-1 md:flex-initial">
                <button
                  onClick={() => { setStatusFilter('all'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setStatusFilter('preconfirmed'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    statusFilter === 'preconfirmed'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  Preconfirmed
                </button>
                <button
                  onClick={() => { setStatusFilter('settled'); resetDisplayCount(); }}
                  className={`px-2 py-1 text-xs uppercase font-bold transition-colors ${
                    statusFilter === 'settled'
                      ? 'bg-arkade-purple text-white border-2 border-arkade-purple'
                      : 'text-arkade-gray border-2 border-arkade-purple hover:text-arkade-purple'
                  }`}
                >
                  Settled
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <VtxoList vtxos={displayedVtxos} />
        
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-6">
            <div className="flex items-center space-x-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border-4 border-arkade-purple border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-arkade-gray uppercase text-sm">
                Loading more... ({vtxos.length - displayCount} remaining)
              </span>
            </div>
          </div>
        )}

        {!hasMore && vtxos.length > itemsPerPage && (
          <div className="text-center py-4">
            <p className="text-arkade-gray text-sm uppercase">
              Showing all {vtxos.length} VTXOs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
