'use client';

import Link from 'next/link';
import { ArkadeLogo } from '@/components/shared/arkade-logo';

export function MinimalNav() {
  return (
    <header className="flex items-center justify-center h-14 border-b border-border bg-card/50 backdrop-blur-sm" role="banner">
      <Link href="/" aria-label="Arkade Explorer home">
        <ArkadeLogo size="lg" />
      </Link>
    </header>
  );
}
