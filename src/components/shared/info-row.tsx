'use client';

import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}

export function InfoRow({ label, value, mono = false, className = '' }: InfoRowProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-border last:border-b-0 ${className}`}>
      <dt className="text-sm text-muted-foreground sm:w-48 shrink-0 font-medium">
        {label}
      </dt>
      <dd className={`text-sm text-foreground min-w-0 break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
