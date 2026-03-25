'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { ArkadeLogo } from '@/components/shared/arkade-logo';

export function TopNav() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      if (isValidTxid(q)) {
        router.push(`/tx/${q}`);
      } else if (isValidOutpoint(q)) {
        router.push(`/tx/${q}`);
      } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
        router.push(`/address/${q}`);
      } else {
        router.push(`/tx/${q}`);
      }
      setQuery('');
    },
    [query, router],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm" role="banner">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">
        <Link href="/" className="shrink-0" aria-label="Arkade Explorer home">
          <ArkadeLogo size="md" />
        </Link>

        <form
          onSubmit={handleSearch}
          className="hidden sm:flex items-center gap-2 flex-1 max-w-md mx-6"
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
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
            />
          </div>
        </form>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={EXTERNAL_LINKS.ARKADE}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 active:scale-[0.97]"
            aria-label="Try Arkade (opens in new tab)"
          >
            Try Arkade
          </Link>
        </div>
      </div>
    </header>
  );
}
