'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Search, Home, Activity, BookOpen, ExternalLink } from 'lucide-react';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ArkadeLogo } from '@/components/shared/arkade-logo';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: EXTERNAL_LINKS.DOCS, label: 'Docs', icon: BookOpen, external: true },
];

export function SidebarNav() {
  const pathname = usePathname();
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
    <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0" role="complementary" aria-label="Sidebar navigation">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <Link href="/" aria-label="Arkade Explorer home">
          <ArkadeLogo size="md" />
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <form onSubmit={handleSearch} role="search" aria-label="Search transactions, addresses, and outpoints">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="sidebar-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              aria-label="Search by transaction ID, address, or outpoint"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-200"
            />
          </div>
        </form>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = !item.external && pathname === item.href;

          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200"
                aria-label={`${item.label} (opens in new tab)`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" aria-hidden="true" />
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <a
          href={EXTERNAL_LINKS.ARKADE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors duration-200 active:scale-[0.97]"
          aria-label="Try Arkade (opens in new tab)"
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          <span>Try Arkade</span>
        </a>
      </div>
    </aside>
  );
}
