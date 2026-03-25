'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, ArrowLeft } from 'lucide-react';
import { LiveFeedSidebar, SidebarWelcome, MobileFeedDrawer } from '@/components/shared/live-feed-sidebar';
import { cn } from '@/lib/utils';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

export function SidebarLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTxid, setSelectedTxid] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'transaction' | 'round' | 'vtxo' | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isHome = pathname === '/';
  const isDetailPage = !isHome;

  const handleSelectEvent = useCallback((txid: string, type: 'transaction' | 'round' | 'vtxo') => {
    setSelectedTxid(txid);
    setSelectedType(type);
    setMobileDrawerOpen(false);

    // Navigate based on type
    if (type === 'round') {
      router.push(`/commitment-tx/${txid}`);
    } else {
      router.push(`/tx/${txid}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <LiveFeedSidebar
          selectedTxid={selectedTxid}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with menu button */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-card/50">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-[0.97]"
            aria-label="Open live feed"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground">Arkade Explorer</span>
        </div>

        {/* Breadcrumb on detail pages */}
        {isDetailPage && (
          <div className="px-6 pt-4">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to feed
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="motion-reduce:animate-none"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile drawer */}
      <MobileFeedDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        selectedTxid={selectedTxid}
        onSelectEvent={handleSelectEvent}
      />
    </div>
  );
}
