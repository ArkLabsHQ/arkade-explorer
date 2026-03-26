import { Link, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { ArkadeLogo } from '@/components/shared/arkade-logo';
import { SearchCommandPaletteOverlay } from '@/components/shared/search-bar';

export function TopNav() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isMac, setIsMac] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform?.toLowerCase().includes('mac') ?? true);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      if (isValidTxid(q)) {
        navigate(`/tx/${q}`);
      } else if (isValidOutpoint(q)) {
        navigate(`/tx/${q}`);
      } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
        navigate(`/address/${q}`);
      } else {
        navigate(`/tx/${q}`);
      }
      setQuery('');
    },
    [query, navigate],
  );

  // Cmd+K to focus search (desktop) or open palette (mobile)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // On small screens, open the command palette
        if (window.innerWidth < 640) {
          setCommandPaletteOpen(true);
        } else {
          document.getElementById('global-search')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm" role="banner">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">
        <Link to="/" className="shrink-0" aria-label="Arkade Explorer home">
          <ArkadeLogo size="md" />
        </Link>

        {/* Mobile search icon */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="sm:hidden p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Open search"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Mobile command palette overlay */}
        <SearchCommandPaletteOverlay
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />

        <form
          onSubmit={handleSearch}
          className="hidden sm:flex items-center flex-1 max-w-lg mx-6"
          role="search"
          aria-label="Search transactions, addresses, and outpoints"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="global-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search txid, address, or outpoint..."
              aria-label="Search by transaction ID, address, or outpoint"
              className="w-full h-9 pl-9 pr-16 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {isMac ? '\u2318' : 'Ctrl+'}K
            </kbd>
          </div>
        </form>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={EXTERNAL_LINKS.ARKADE}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors duration-200 active:scale-[0.97]"
            aria-label="Try Arkade (opens in new tab)"
          >
            Try Arkade
          </a>
        </div>
      </div>
    </header>
  );
}
