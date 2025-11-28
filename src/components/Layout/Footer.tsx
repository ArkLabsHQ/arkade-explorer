import { useMoneyDisplay } from '../../contexts/MoneyDisplayContext';

export function Footer() {
  const { unit, toggleUnit } = useMoneyDisplay();
  
  return (
    <footer className="border-t-2 border-arkade-purple bg-arkade-black py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-arkade-gray text-sm">
            YOU CAN JUST DO THINGS © | POWERED BY ARKADE
          </p>
          <button
            onClick={toggleUnit}
            className="text-arkade-gray hover:text-arkade-orange transition-colors text-xs underline"
            title={`Switch to ${unit === 'sats' ? 'BTC' : 'sats'}`}
          >
            Display: {unit === 'sats' ? 'Satoshis' : 'Bitcoin'}
          </button>
        </div>
      </div>
    </footer>
  );
}
