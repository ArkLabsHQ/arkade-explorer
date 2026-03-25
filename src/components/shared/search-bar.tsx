'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Clock, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStructure } from '@/hooks/use-structure';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { truncateHash, formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { SearchVariant } from '@/structures';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchBarProps {
  variant?: SearchVariant;
  className?: string;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Shared search logic
// ---------------------------------------------------------------------------

function useSearch() {
  const router = useRouter();
  const { addRecentSearch } = useRecentSearches();

  const navigate = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;

      if (isValidTxid(q)) {
        addRecentSearch(q, 'transaction');
        router.push(`/tx/${q}`);
      } else if (isValidOutpoint(q)) {
        addRecentSearch(q, 'transaction');
        router.push(`/tx/${q}`);
      } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
        addRecentSearch(q, 'address');
        router.push(`/address/${q}`);
      } else {
        addRecentSearch(q, 'transaction');
        router.push(`/tx/${q}`);
      }
    },
    [router, addRecentSearch],
  );

  return { navigate };
}

// ---------------------------------------------------------------------------
// Header variant (compact search in top nav)
// ---------------------------------------------------------------------------

function SearchHeader({ className, placeholder }: { className?: string; placeholder?: string }) {
  const { navigate } = useSearch();
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      navigate(query);
      setQuery('');
    },
    [query, navigate],
  );

  return (
    <form onSubmit={handleSubmit} className={cn('relative max-w-md', className)} role="search" aria-label="Search transactions, addresses, and outpoints">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? 'Search txid, address, or outpoint...'}
        aria-label="Search by transaction ID, address, or outpoint"
        className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Hero variant (large centered search with heading)
// ---------------------------------------------------------------------------

function SearchHero({ className, placeholder }: { className?: string; placeholder?: string }) {
  const { navigate } = useSearch();
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      navigate(query);
      setQuery('');
    },
    [query, navigate],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
      className={cn('w-full max-w-2xl mx-auto', className)}
    >
      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground text-center mb-3 tracking-tight">
        Arkade Explorer
      </h1>
      <p className="text-muted-foreground text-center mb-6 text-sm sm:text-base">
        Explore transactions, VTXOs, and addresses on the Arkade protocol
      </p>
      <form onSubmit={handleSubmit} className="relative" role="search" aria-label="Search transactions, addresses, and outpoints">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Search by txid, address, or outpoint...'}
          aria-label="Search by transaction ID, address, or outpoint"
          className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-ring/40 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)] transition-shadow duration-200"
        />
      </form>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar variant (full-width search in sidebar)
// ---------------------------------------------------------------------------

function SearchSidebar({ className, placeholder }: { className?: string; placeholder?: string }) {
  const { navigate } = useSearch();
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      navigate(query);
      setQuery('');
    },
    [query, navigate],
  );

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)} role="search" aria-label="Search transactions, addresses, and outpoints">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? 'Search...'}
        aria-label="Search by transaction ID, address, or outpoint"
        className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Command-palette variant (cmdk-style, triggered by Cmd+K)
// ---------------------------------------------------------------------------

function SearchCommandPalette({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { navigate } = useSearch();
  const [query, setQuery] = useState('');
  const { recentSearches, clearRecentSearches } = useRecentSearches();

  // Listen for Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      navigate(value);
      setOpen(false);
      setQuery('');
    },
    [navigate],
  );

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      navigate(query.trim());
      setOpen(false);
      setQuery('');
    }
  }, [query, navigate]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open search (Cmd+K)"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors duration-200 active:scale-[0.97]',
          className,
        )}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Search...</span>
        <kbd className="ml-auto px-1.5 py-0.5 rounded bg-card border border-border text-xs font-mono text-muted-foreground">
          {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? '') ? '\u2318' : 'Ctrl+'}K
        </kbd>
      </button>

      {/* Overlay + Dialog */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Command dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.2, ease: [0.165, 0.84, 0.44, 1] }}
              className="fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2"
            >
              <Command
                className="rounded-xl border border-border bg-card shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2),0_8px_16px_hsl(var(--border)/0.15)] overflow-hidden"
                shouldFilter={false}
              >
                {/* Input */}
                <div className="flex items-center border-b border-border px-3">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Command.Input
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search txid, address, or outpoint..."
                    className="flex-1 h-12 px-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close search"
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Results */}
                <Command.List className="max-h-72 overflow-y-auto p-2">
                  <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                    {query.trim()
                      ? 'Press Enter to search'
                      : 'Type to search or select a recent search'}
                  </Command.Empty>

                  {/* Direct search action */}
                  {query.trim() && (
                    <Command.Group>
                      <Command.Item
                        value={query.trim()}
                        onSelect={handleSelect}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground cursor-pointer data-[selected=true]:bg-secondary transition-colors duration-150"
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          Search for &ldquo;<span className="font-mono">{truncateHash(query.trim(), 16, 8)}</span>&rdquo;
                        </span>
                      </Command.Item>
                    </Command.Group>
                  )}

                  {/* Recent searches */}
                  {recentSearches.length > 0 && !query.trim() && (
                    <Command.Group
                      heading={
                        <div className="flex items-center justify-between px-1 py-1.5">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Recent searches
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearRecentSearches();
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                          >
                            Clear
                          </button>
                        </div>
                      }
                    >
                      {recentSearches.slice(0, 6).map((search) => (
                        <Command.Item
                          key={search.value}
                          value={search.value}
                          onSelect={handleSelect}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-secondary transition-colors duration-150"
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs text-foreground truncate">
                            {truncateHash(search.value, 12, 8)}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">
                            {search.type}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </Command.List>

                {/* Footer hint */}
                <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono text-[10px]">
                        Enter
                      </kbd>
                      <span>to search</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono text-[10px]">
                        Esc
                      </kbd>
                      <span>to close</span>
                    </span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component (variant-aware)
// ---------------------------------------------------------------------------

export function SearchBar({ variant: overrideVariant, className, placeholder }: SearchBarProps) {
  const { preferences } = useStructure();
  const variant = overrideVariant ?? preferences.searchVariant;

  switch (variant) {
    case 'header':
      return <SearchHeader className={className} placeholder={placeholder} />;
    case 'hero':
      return <SearchHero className={className} placeholder={placeholder} />;
    case 'sidebar':
      return <SearchSidebar className={className} placeholder={placeholder} />;
    case 'command-palette':
      return <SearchCommandPalette className={className} />;
    default:
      return <SearchHeader className={className} placeholder={placeholder} />;
  }
}
