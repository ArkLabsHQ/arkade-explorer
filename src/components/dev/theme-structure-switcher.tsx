'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Palette, LayoutGrid } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useStructure } from '@/hooks/use-structure';
import { THEMES, THEME_NAMES, type ThemeName } from '@/themes';
import { STRUCTURES, STRUCTURE_NAMES, type StructureName } from '@/structures';
import { cn } from '@/lib/utils';

type Tab = 'theme' | 'structure';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

export function ThemeStructureSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('theme');
  const { theme, setTheme } = useTheme();
  const { structure, setStructure } = useStructure();

  const panelRef = useRef<HTMLDivElement>(null);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Trap focus within panel when open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector<HTMLElement>('button, [tabindex]');
      firstFocusable?.focus();
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            ref={panelRef}
            role="dialog"
            aria-label="Theme and structure settings"
            className="absolute bottom-14 right-0 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('theme')}
                role="tab"
                aria-selected={activeTab === 'theme'}
                aria-controls="switcher-theme-panel"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                  activeTab === 'theme'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Palette className="h-4 w-4" aria-hidden="true" />
                Theme
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                role="tab"
                aria-selected={activeTab === 'structure'}
                aria-controls="switcher-structure-panel"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                  activeTab === 'structure'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Structure
              </button>
            </div>

            {/* Content */}
            <div className="p-3 max-h-80 overflow-y-auto">
              {activeTab === 'theme' ? (
                <div id="switcher-theme-panel" role="tabpanel" aria-label="Theme options" className="grid grid-cols-2 gap-2">
                  {THEME_NAMES.map((name) => {
                    const meta = THEMES[name];
                    const isActive = theme === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setTheme(name)}
                        aria-label={`${meta.label} theme${isActive ? ' (active)' : ''}`}
                        aria-pressed={isActive}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-200 active:scale-[0.97]',
                          isActive
                            ? 'bg-accent ring-1 ring-primary'
                            : 'hover:bg-secondary',
                        )}
                      >
                        {/* Color swatch */}
                        <div className="shrink-0 flex flex-col gap-0.5">
                          <div
                            className="w-6 h-3 rounded-t-sm border border-white/10"
                            style={{ backgroundColor: meta.preview.bg }}
                          />
                          <div
                            className="w-6 h-3 rounded-b-sm border border-white/10"
                            style={{ backgroundColor: meta.preview.surface }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            {meta.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {meta.isDark ? 'Dark' : 'Light'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div id="switcher-structure-panel" role="tabpanel" aria-label="Structure options" className="space-y-1.5">
                  {STRUCTURE_NAMES.map((name) => {
                    const def = STRUCTURES[name];
                    const isActive = structure === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setStructure(name)}
                        aria-label={`${def.label} structure${isActive ? ' (active)' : ''}`}
                        aria-pressed={isActive}
                        className={cn(
                          'w-full flex flex-col gap-0.5 p-2.5 rounded-lg text-left transition-all duration-200 active:scale-[0.97]',
                          isActive
                            ? 'bg-accent ring-1 ring-primary'
                            : 'hover:bg-secondary',
                        )}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {def.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {def.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current combo */}
            <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground text-center">
              {THEMES[theme].label} + {STRUCTURES[structure].label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={toggle}
        className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center',
          'bg-primary text-primary-foreground shadow-lg',
          'hover:bg-primary/90 transition-all duration-200 active:scale-[0.97]',
        )}
        aria-label={isOpen ? 'Close dev switcher' : 'Open dev switcher'}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
      </button>
    </div>
  );
}
