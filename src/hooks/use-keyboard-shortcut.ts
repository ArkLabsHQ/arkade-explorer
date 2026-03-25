'use client';

import { useEffect } from 'react';

export function useKeyboardShortcut(key: string, callback: () => void, options?: { meta?: boolean; ctrl?: boolean }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (options?.meta && !e.metaKey) return;
      if (options?.ctrl && !e.ctrlKey) return;
      if (e.key === key) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, options?.meta, options?.ctrl]);
}
