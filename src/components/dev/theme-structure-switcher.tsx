'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, LayoutGrid } from 'lucide-react';
import { useStructure } from '@/hooks/use-structure';
import { STRUCTURES, STRUCTURE_NAMES } from '@/structures';
import { cn } from '@/lib/utils';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

export function ThemeStructureSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { structure, setStructure } = useStructure();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

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
            aria-label="Structure settings"
            className="absolute bottom-14 right-0 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Structure
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1.5">
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

            <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground text-center">
              {STRUCTURES[structure].label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
