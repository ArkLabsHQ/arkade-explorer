import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Clock, X, Pin, PinOff } from 'lucide-react';
import { useRecentSearches } from '../../hooks/useRecentSearches';

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const navigate = useNavigate();
  const { 
    recentSearches, 
    pinnedSearches, 
    addRecentSearch, 
    clearRecentSearches, 
    pinSearch, 
    unpinSearch, 
    clearPinnedSearches,
    isPinned 
  } = useRecentSearches();

  const closeModal = () => {
    setShowSearchModal(false);
  };

  const openModal = () => {
    setShowSearchModal(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    
    if (/^[0-9a-fA-F]{64}$/.test(query)) {
      addRecentSearch(query, 'transaction');
      navigate(`/tx/${query}`);
    } else {
      addRecentSearch(query, 'address');
      navigate(`/address/${query}`);
    }
    
    setSearchQuery('');
    closeModal();
  };

  const getRecentSearchPath = (value: string, type: string) => {
    if (type === 'commitment-tx') {
      return `/commitment-tx/${value}`;
    } else if (type === 'transaction') {
      return `/tx/${value}`;
    } else {
      return `/address/${value}`;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'commitment-tx': return 'Commitment TX';
      case 'transaction': return 'Transaction';
      case 'address': return 'Address';
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'commitment-tx': return 'bg-arkade-orange';
      case 'transaction': return 'bg-arkade-purple';
      case 'address': return 'bg-green-500';
      default: return 'bg-arkade-gray';
    }
  };

  return (
    <>
      {/* Search button - opens modal on both mobile and desktop */}
      <button
        type="button"
        onClick={openModal}
        className="retro-button"
        aria-label="Search"
      >
        <Search size={20} />
      </button>

    {/* Unified Search Modal */}
    {showSearchModal && createPortal(
      <>
        <div
          className="modal-backdrop z-[99]"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={closeModal}
        />
        <div 
          className="mobile-search-modal z-[100] bg-arkade-black border-2 border-arkade-purple p-4"
          style={{ 
            position: 'fixed',
            top: '5rem',
            left: '1rem',
            right: '1rem',
            maxWidth: '42rem',
            margin: '0 auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Transaction ID or Address..."
                className="w-full px-4 py-3 bg-arkade-black border-2 border-arkade-purple text-arkade-gray font-mono focus:outline-none focus:border-arkade-orange placeholder-gray-600"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 retro-button"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            </div>
          </form>
          
          {/* Search history section */}
          {(recentSearches.length > 0 || pinnedSearches.length > 0) && (
            <div className="mt-4 border-t-2 border-arkade-purple pt-4">
              {/* Toggle between Recent and Pinned - only show if both have items */}
              <div className="flex items-center justify-between mb-3">
                {recentSearches.length > 0 && pinnedSearches.length > 0 ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPinned(false)}
                      className={`flex items-center space-x-1 px-3 py-1 transition-colors ${
                        !showPinned 
                          ? 'text-arkade-purple border-b-2 border-arkade-purple' 
                          : 'text-arkade-gray hover:text-arkade-purple'
                      }`}
                    >
                      <Clock size={16} />
                      <span className="uppercase text-xs font-bold">Recent ({recentSearches.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPinned(true)}
                      className={`flex items-center space-x-1 px-3 py-1 transition-colors ${
                        showPinned 
                          ? 'text-arkade-purple border-b-2 border-arkade-purple' 
                          : 'text-arkade-gray hover:text-arkade-purple'
                      }`}
                    >
                      <Pin size={16} />
                      <span className="uppercase text-xs font-bold">Pinned ({pinnedSearches.length})</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {pinnedSearches.length > 0 ? (
                      <>
                        <Pin size={16} className="text-arkade-purple" />
                        <span className="text-arkade-gray uppercase text-xs font-bold">Pinned Searches</span>
                      </>
                    ) : (
                      <>
                        <Clock size={16} className="text-arkade-purple" />
                        <span className="text-arkade-gray uppercase text-xs font-bold">Recent Searches</span>
                      </>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={showPinned || pinnedSearches.length > 0 && recentSearches.length === 0 ? clearPinnedSearches : clearRecentSearches}
                  className="text-arkade-gray hover:text-arkade-orange transition-colors text-xs uppercase font-bold flex items-center space-x-1"
                  title={`Clear all ${showPinned || (pinnedSearches.length > 0 && recentSearches.length === 0) ? 'pinned' : 'recent'} searches`}
                >
                  <span>Clear {recentSearches.length > 0 && pinnedSearches.length > 0 ? (showPinned ? 'Pinned' : 'Recent') : 'All'}</span>
                  <X size={14} />
                </button>
              </div>
              
              {/* Search items */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {((showPinned && pinnedSearches.length > 0) || recentSearches.length === 0 ? pinnedSearches : recentSearches).slice(0, 10).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex p-3 bg-arkade-black border border-arkade-purple hover:bg-arkade-purple hover:bg-opacity-30 transition-all duration-200 items-center justify-between space-x-3"
                  >
                    <Link
                      to={getRecentSearchPath(item.value, item.type)}
                      onClick={closeModal}
                      className="text-arkade-gray font-mono text-xs truncate flex-1 no-underline hover:text-arkade-orange transition-colors"
                    >
                      {item.value.length > 30 ? `${item.value.slice(0, 15)}...${item.value.slice(-15)}` : item.value}
                    </Link>
                    <span className={`${getTypeBadgeColor(item.type)} text-white text-xs px-2 py-1 uppercase font-bold flex-shrink-0`}>
                      {getTypeLabel(item.type)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPinned(item.value)) {
                          unpinSearch(item.value);
                        } else {
                          pinSearch(item.value, item.type);
                        }
                      }}
                      className={`p-1 transition-colors flex-shrink-0 ${
                        isPinned(item.value)
                          ? 'text-arkade-orange hover:text-arkade-purple'
                          : 'text-arkade-gray hover:text-arkade-orange'
                      }`}
                      title={isPinned(item.value) ? 'Unpin' : 'Pin'}
                    >
                      {isPinned(item.value) ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>,
      document.body
    )}
    </>
  );
}
