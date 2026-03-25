'use client';

import { useCallback, useEffect } from 'react';
import { useStructure } from '@/hooks/use-structure';
import { TopNav } from '@/components/nav/top-nav';
import { SidebarNav } from '@/components/nav/sidebar-nav';
import { MinimalNav } from '@/components/nav/minimal-nav';
import { Footer } from '@/components/nav/footer';
import { TerminalLayout } from '@/structures/terminal';
import { SidebarLayout } from '@/structures/sidebar';
import { KanbanLayout } from '@/structures/kanban';
import { TreemapLayout } from '@/structures/treemap';
import { cn } from '@/lib/utils';

function useGlobalSearchShortcut() {
  const handleSearchShortcut = useCallback(() => {
    // Try to find and focus a visible search input
    const searchInput =
      document.getElementById('global-search') ||
      document.getElementById('sidebar-search');
    if (searchInput) {
      searchInput.focus();
      return;
    }
    // Fallback: find any visible search input
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
    for (const input of inputs) {
      if (input.offsetParent !== null) {
        input.focus();
        return;
      }
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleSearchShortcut();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSearchShortcut]);
}

export function DynamicLayout({ children }: { children: React.ReactNode }) {
  const { structure, preferences } = useStructure();

  // Register Cmd+K / Ctrl+K to focus search
  useGlobalSearchShortcut();

  // Sidebar structure: master-detail with live feed left, content right
  if (structure === 'sidebar') {
    return <SidebarLayout>{children}</SidebarLayout>;
  }

  // Terminal structure: command-line aesthetic
  if (structure === 'terminal') {
    return <TerminalLayout>{children}</TerminalLayout>;
  }

  // Kanban structure: VTXO lifecycle board
  if (structure === 'kanban') {
    return <KanbanLayout>{children}</KanbanLayout>;
  }

  // Treemap structure: proportional rectangles
  if (structure === 'treemap') {
    return <TreemapLayout>{children}</TreemapLayout>;
  }

  // Blocks horizon structure: minimal nav, full-width content, no max-width
  if (structure === 'blocks-horizon') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalNav />
        <main className="flex-1 w-full px-4 py-6">{children}</main>
        <Footer />
      </div>
    );
  }

  // Explorer structure: minimal nav, max-w-7xl centered content
  if (structure === 'explorer') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalNav />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  // Blocks split: minimal nav, full-width (home content handles its own layout)
  if (structure === 'blocks-split') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalNav />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    );
  }

  // Blocks tabs: minimal nav, content handles its own max-width
  if (structure === 'blocks-tabs') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalNav />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    );
  }

  // Blocks timeline: minimal nav, content handles its own max-width
  if (structure === 'blocks-timeline') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalNav />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    );
  }

  // All other structures: nav variant + centered content + footer
  const renderNav = () => {
    switch (preferences.navVariant) {
      case 'top':
        return <TopNav />;
      case 'minimal':
        return <MinimalNav />;
      case 'sidebar':
        return null; // Handled above
      case 'hidden':
        return null;
      default:
        return <TopNav />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {renderNav()}
      <main
        className={cn(
          'flex-1',
          preferences.maxWidth || '',
          preferences.maxWidth ? 'mx-auto w-full' : '',
          preferences.contentPadding,
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
