'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArkadeLogo } from '@/components/shared/arkade-logo';

export function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background font-mono">
      {/* Minimal terminal header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card/30">
        <Link href="/" aria-label="Arkade Explorer home">
          <ArkadeLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Terminal mode</span>
          </span>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}
