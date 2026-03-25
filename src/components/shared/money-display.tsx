'use client';

import { useMoneyDisplay } from '@/providers/money-display-provider';
import { satsToBTC } from '@/lib/formatters';
import { formatSats } from '@/lib/utils';

interface MoneyDisplayProps {
  sats: number;
  className?: string;
}

export function MoneyDisplay({ sats, className = '' }: MoneyDisplayProps) {
  const { unit } = useMoneyDisplay();

  if (unit === 'btc') {
    return <span className={className}>{satsToBTC(sats)} BTC</span>;
  }
  return <span className={className}>{formatSats(sats)} sats</span>;
}
