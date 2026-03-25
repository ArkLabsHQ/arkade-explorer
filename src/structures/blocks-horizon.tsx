'use client';

import { type ReactNode } from 'react';

export function BlocksLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
