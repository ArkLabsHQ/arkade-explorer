import { useMoneyDisplay } from '../../contexts/MoneyDisplayContext';

interface MoneyDisplayProps {
  sats: number | bigint;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
  showUnit?: boolean;
  layout?: 'inline' | 'block';
}

/**
 * Formats satoshis as BTC with commas (like sats) and identifies leading zeros
 * 65560 sats -> 0.00065560 BTC -> 0,00065,560 BTC
 * Returns object with parts for styling
 */
function formatAsBTC(sats: number | bigint): { leadingZeros: string; significantPart: string } {
  const satsNum = typeof sats === 'bigint' ? Number(sats) : sats;
  const btc = satsNum / 100_000_000;
  
  // Format to 8 decimal places
  const fullNumber = btc.toFixed(8);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart = ''] = fullNumber.split('.');
  
  // First, identify leading zeros in decimal part BEFORE formatting
  const leadingZerosMatch = decimalPart.match(/^(0*)/);
  const leadingZerosCount = leadingZerosMatch ? leadingZerosMatch[1].length : 0;
  const significantDigits = decimalPart.slice(leadingZerosCount);
  
  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Format significant digits with commas (every 3 digits from right)
  // Reverse, add commas, then reverse back - but only if there's a full group of 3
  const reversed = significantDigits.split('').reverse().join('');
  const formattedReversed = reversed.replace(/(\d{3})(?=\d)/g, '$1,');
  const formattedSignificant = formattedReversed.split('').reverse().join('');
  
  // Build the leading zeros part (without commas)
  const leadingZerosPart = integerPart === '0' && leadingZerosCount > 0
    ? `0.${'0'.repeat(leadingZerosCount)}`
    : '';
  
  if (leadingZerosPart) {
    return {
      leadingZeros: leadingZerosPart,
      significantPart: formattedSignificant
    };
  }
  
  // No leading zeros case
  const formatted = `${formattedInteger}.${formattedSignificant}`;
  return {
    leadingZeros: '',
    significantPart: formatted
  };
}

/**
 * Formats satoshis with comma separators
 * 1000000 -> 1,000,000
 */
function formatAsSats(sats: number | bigint): string {
  const satsNum = typeof sats === 'bigint' ? Number(sats) : sats;
  return satsNum.toLocaleString('en-US');
}

export function MoneyDisplay({ 
  sats, 
  className = '', 
  valueClassName = '',
  unitClassName = '',
  showUnit = true,
  layout = 'inline'
}: MoneyDisplayProps) {
  const { unit } = useMoneyDisplay();
  
  const unitLabel = unit === 'btc' ? 'BTC' : 'sats';
  
  // Render BTC with muted leading zeros
  if (unit === 'btc') {
    const { leadingZeros, significantPart } = formatAsBTC(sats);
    
    if (layout === 'block') {
      return (
        <div className={className}>
          <div className={valueClassName}>
            {leadingZeros && <span className="opacity-30">{leadingZeros}</span>}
            {significantPart}
          </div>
          {showUnit && <div className={unitClassName}>{unitLabel}</div>}
        </div>
      );
    }
    
    return (
      <span className={className}>
        <span className={valueClassName}>
          {leadingZeros && <span className="opacity-30">{leadingZeros}</span>}
          {significantPart}
        </span>
        {showUnit && <span className={unitClassName}> {unitLabel}</span>}
      </span>
    );
  }
  
  // Render sats normally
  const value = formatAsSats(sats);
  
  if (layout === 'block') {
    return (
      <div className={className}>
        <div className={valueClassName}>{value}</div>
        {showUnit && <div className={unitClassName}>{unitLabel}</div>}
      </div>
    );
  }
  
  return (
    <span className={className}>
      <span className={valueClassName}>{value}</span>
      {showUnit && <span className={unitClassName}> {unitLabel}</span>}
    </span>
  );
}
