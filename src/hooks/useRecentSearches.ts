import { useState, useEffect, useCallback } from 'react';

export interface RecentSearch {
  value: string;
  type: 'address' | 'transaction' | 'commitment-tx';
  timestamp: number;
  label?: string;
}

const STORAGE_KEY = 'arkade-explorer-recent-searches';
const PINNED_STORAGE_KEY = 'arkade-explorer-pinned-searches';
const MAX_RECENT = 10;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [pinnedSearches, setPinnedSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const loadSearches = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentSearches(parsed);
        }
        
        const pinnedStored = localStorage.getItem(PINNED_STORAGE_KEY);
        if (pinnedStored) {
          const pinnedParsed = JSON.parse(pinnedStored);
          setPinnedSearches(pinnedParsed);
        }
      } catch (error) {
        console.error('Failed to load searches:', error);
      }
    };

    // Load initially
    loadSearches();

    // Listen for storage changes from other components/tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === PINNED_STORAGE_KEY) {
        loadSearches();
      }
    };

    // Listen for custom event for same-window updates
    const handleCustomStorageChange = () => {
      loadSearches();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleCustomStorageChange);
    };
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

      // Save to localStorage (no event dispatch needed - state update handles UI)
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

  const pinSearch = useCallback((value: string, type: RecentSearch['type'], label?: string) => {
    setPinnedSearches((prev) => {
      // Check if already pinned
      if (prev.some((item) => item.value === value)) {
        return prev;
      }
      
      // Add to pinned
      const updated = [
        { value, type, timestamp: Date.now(), label },
        ...prev,
      ];

      // Save to localStorage
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('localStorageUpdate'));
      } catch (error) {
        console.error('Failed to save pinned searches:', error);
      }

      return updated;
    });
  }, []);

  const updatePinLabel = useCallback((value: string, label: string) => {
    setPinnedSearches((prev) => {
      const updated = prev.map((item) =>
        item.value === value ? { ...item, label } : item
      );

      // Save to localStorage
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('localStorageUpdate'));
      } catch (error) {
        console.error('Failed to update pin label:', error);
      }

      return updated;
    });
  }, []);

  const unpinSearch = useCallback((value: string) => {
    setPinnedSearches((prev) => {
      const updated = prev.filter((item) => item.value !== value);
      
      // Save to localStorage
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('localStorageUpdate'));
      } catch (error) {
        console.error('Failed to save pinned searches:', error);
      }

      return updated;
    });
  }, []);

  const clearPinnedSearches = useCallback(() => {
    setPinnedSearches([]);
    try {
      localStorage.removeItem(PINNED_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear pinned searches:', error);
    }
  }, []);

  const isPinned = useCallback((value: string) => {
    return pinnedSearches.some((item) => item.value === value);
  }, [pinnedSearches]);

  return {
    recentSearches,
    pinnedSearches,
    addRecentSearch,
    clearRecentSearches,
    pinSearch,
    unpinSearch,
    updatePinLabel,
    clearPinnedSearches,
    isPinned,
  };
}
