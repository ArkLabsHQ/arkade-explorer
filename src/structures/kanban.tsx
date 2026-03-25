'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArkadeLogo } from '@/components/shared/arkade-logo';
import { SearchBar } from '@/components/shared/search-bar';

export function KanbanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <Link href="/" aria-label="Arkade Explorer home">
          <ArkadeLogo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
            <span className="text-xs text-primary font-medium">Kanban</span>
          </span>
          <SearchBar variant="header" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
