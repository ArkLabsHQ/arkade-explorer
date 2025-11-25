import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Clock, X } from 'lucide-react';
import { useRecentSearches } from '../../hooks/useRecentSearches';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className = '' }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const navigate = useNavigate();
  const { recentSearches, clearRecentSearches } = useRecentSearches();

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
      navigate(`/tx/${query}`);
    } else {
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
          
          {/* Recent searches in mobile modal */}
          {recentSearches.length > 0 && (
            <div className="mt-4 border-t-2 border-arkade-purple pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-arkade-purple" />
                  <span className="text-arkade-gray uppercase text-xs font-bold">Recent Searches</span>
                </div>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-arkade-gray hover:text-arkade-orange transition-colors"
                  title="Clear all"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentSearches.slice(0, 10).map((item, idx) => (
                  <Link
                    key={idx}
                    to={getRecentSearchPath(item.value, item.type)}
                    onClick={closeModal}
                    className="flex w-full p-3 bg-arkade-black border border-arkade-purple hover:bg-arkade-purple hover:bg-opacity-30 transition-all duration-200 items-center justify-between space-x-3 no-underline"
                  >
                    <span className="text-arkade-gray font-mono text-xs truncate flex-1">
                      {item.value.length > 30 ? `${item.value.slice(0, 15)}...${item.value.slice(-15)}` : item.value}
                    </span>
                    <span className={`${getTypeBadgeColor(item.type)} text-white text-xs px-2 py-1 uppercase font-bold flex-shrink-0`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </Link>
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
