import { useMoneyDisplay } from '../../contexts/MoneyDisplayContext';

function SatSymbol({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <line x1="6" y1="7" x2="18" y2="7" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

function BitcoinSymbol({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
    </svg>
  );
}

export function MoneyUnitToggle() {
  const { unit, toggleUnit } = useMoneyDisplay();
  
  return (
    <button
      onClick={toggleUnit}
      className="cursor-pointer p-2 text-arkade-white hover:text-arkade-orange transition-colors flex items-center justify-center"
      aria-label="Toggle money unit"
      title={`Switch to ${unit === 'sats' ? 'BTC' : 'sats'}`}
      style={{ width: '36px', height: '36px' }}
    >
      {unit === 'sats' ? (
        <SatSymbol size={20} />
      ) : (
        <BitcoinSymbol size={20} />
      )}
    </button>
  );
}
