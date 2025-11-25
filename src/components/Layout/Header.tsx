import { Link } from 'react-router-dom';
import { SearchBar } from '../UI/SearchBar';
import { ThemeToggle } from '../UI/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';
import logoBlack from '../../assets/logo-black.svg';
import logoOrange from '../../assets/logo-orange.svg';

export function Header() {
  const { resolvedTheme } = useTheme();

  return (
    <header className="border-b-2 border-arkade-purple bg-arkade-black py-4 retro-glow relative overflow-visible">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 md:gap-4 lg:gap-6 relative overflow-visible">
          <Link to="/" className="flex flex-col items-end md:flex-row md:items-center md:gap-2 gap-0">
            <img
              src={resolvedTheme === 'light' ? logoBlack : logoOrange}
              alt="ARKADE"
              className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto"
            />
            <div className="inline relative bottom-1 md:-bottom-0.5 bg-arkade-purple text-white text-[8px] md:text-xs font-bold uppercase px-1.5 sm:px-2 py-0.5 rounded-md">
              Explorer
            </div>
          </Link>

          <div className="flex-1 min-w-0"></div>

          <div className="flex items-center gap-1 sm:gap-2">
            <SearchBar />
            <a
              href="https://arkade.money"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button shrink-0 hidden sm:block text-xs md:text-sm px-2 md:px-3">
              Try Arkade
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
