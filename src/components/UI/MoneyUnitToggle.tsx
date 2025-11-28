import { useMoneyDisplay } from '../../contexts/MoneyDisplayContext';
import { Bitcoin } from 'lucide-react';

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
        <span className="text-lg font-bold leading-none">₿</span>
      ) : (
        <Bitcoin size={20} />
      )}
    </button>
  );
}
