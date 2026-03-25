'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type ThemeName } from '@/themes';

interface ThemeContextType {
  theme: ThemeName;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dawn', isDark: false });

function getSystemTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dawn';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'dawn';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('dawn');

  useEffect(() => {
    const apply = (t: ThemeName) => {
      setTheme(t);
      document.documentElement.setAttribute('data-theme', t);
      if (t === 'midnight') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    apply(getSystemTheme());

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'midnight' : 'dawn');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'midnight' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
