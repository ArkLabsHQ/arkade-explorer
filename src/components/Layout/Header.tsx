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
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between gap-4 md:gap-6 relative overflow-visible">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 relative">
            <img 
              src={resolvedTheme === 'light' ? logoBlack : logoOrange}
              alt="ARKADE"
              className="h-12 md:h-16 w-auto"
            />
            <div className="absolute -bottom-1 -right-2 md:relative md:bottom-auto md:right-auto bg-arkade-purple text-white text-[10px] md:text-xs font-bold uppercase px-2 py-0.5 rounded-md">
              Explorer
            </div>
          </Link>
          
          <div className="flex-1"></div>

          <div className="flex items-center space-x-2">
            <SearchBar />
            <a
              href="https://arkade.money"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button flex-shrink-0"
            >
              Try Arkade
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
