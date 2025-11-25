import { useState, useEffect, useCallback } from 'react';

export interface RecentSearch {
  value: string;
  type: 'address' | 'transaction' | 'commitment-tx';
  timestamp: number;
}

const STORAGE_KEY = 'arkade-explorer-recent-searches';
const MAX_RECENT = 10;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentSearches(parsed);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  const addRecentSearch = useCallback((value: string, type: RecentSearch['type']) => {
    setRecentSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((item) => item.value !== value);
      
      // Add new item at the beginning
      const updated = [
        { value, type, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent searches:', error);
      }

      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }, []);

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  };
}
