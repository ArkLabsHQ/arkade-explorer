import { useMoneyDisplay } from '@/providers/money-display-provider';
import { formatSats } from '@/lib/utils';

interface MoneyDisplayProps {
  sats: number | bigint;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
  showUnit?: boolean;
  layout?: 'inline' | 'block';
}

/**
 * Formats satoshis as BTC with commas and identifies leading zeros.
 * Leading zeros are returned separately so they can be rendered at reduced opacity.
 *
 * 65560 sats -> 0.00065560 BTC
 * Returns { leadingZeros: '0.000', significantPart: '65,560' }
 */
function formatAsBTC(sats: number | bigint): { leadingZeros: string; significantPart: string } {
  const satsNum = typeof sats === 'bigint' ? Number(sats) : sats;
  const btc = satsNum / 100_000_000;

  // Format to 8 decimal places
  const fullNumber = btc.toFixed(8);

  // Split into integer and decimal parts
  const [integerPart, decimalPart = ''] = fullNumber.split('.');

  // Identify leading zeros in decimal part before formatting
  const leadingZerosMatch = decimalPart.match(/^(0*)/);
  const leadingZerosCount = leadingZerosMatch ? leadingZerosMatch[1].length : 0;
  const significantDigits = decimalPart.slice(leadingZerosCount);

  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Format significant digits with commas (every 3 digits from right)
  const reversed = significantDigits.split('').reverse().join('');
  const formattedReversed = reversed.replace(/(\d{3})(?=\d)/g, '$1,');
  const formattedSignificant = formattedReversed.split('').reverse().join('');

  // Build the leading zeros part (integer.zeros)
  const leadingZerosPart =
    integerPart === '0' && leadingZerosCount > 0
      ? `0.${'0'.repeat(leadingZerosCount)}`
      : '';

  if (leadingZerosPart) {
    return {
      leadingZeros: leadingZerosPart,
      significantPart: formattedSignificant,
    };
  }

  // No leading zeros case
  const formatted = `${formattedInteger}.${formattedSignificant}`;
  return {
    leadingZeros: '',
    significantPart: formatted,
  };
}

export function MoneyDisplay({
  sats,
  className = '',
  valueClassName = '',
  unitClassName = '',
  showUnit = true,
  layout = 'inline',
}: MoneyDisplayProps) {
  const { unit } = useMoneyDisplay();

  const unitLabel = unit === 'btc' ? 'BTC' : 'sats';

  // Render BTC with muted leading zeros
  if (unit === 'btc') {
    const { leadingZeros, significantPart } = formatAsBTC(sats);

    if (layout === 'block') {
      return (
        <div className={`min-w-0 ${className}`}>
          <div className={`tabular-nums ${valueClassName}`}>
            {leadingZeros && <span className="opacity-30">{leadingZeros}</span>}
            {significantPart}
          </div>
          {showUnit && <div className={unitClassName}>{unitLabel}</div>}
        </div>
      );
    }

    return (
      <span className={className}>
        <span className={`tabular-nums ${valueClassName}`}>
          {leadingZeros && <span className="opacity-30">{leadingZeros}</span>}
          {significantPart}
        </span>
        {showUnit && <span className={unitClassName}> {unitLabel}</span>}
      </span>
    );
  }

  // Render sats normally
  const satsNum = typeof sats === 'bigint' ? Number(sats) : sats;
  const value = formatSats(satsNum);

  if (layout === 'block') {
    return (
      <div className={`min-w-0 ${className}`}>
        <div className={`tabular-nums ${valueClassName}`}>{value}</div>
        {showUnit && <div className={unitClassName}>{unitLabel}</div>}
      </div>
    );
  }

  return (
    <span className={className}>
      <span className={`tabular-nums ${valueClassName}`}>{value}</span>
      {showUnit && <span className={unitClassName}> {unitLabel}</span>}
    </span>
  );
}
