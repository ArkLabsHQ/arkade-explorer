'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type StructureName, STRUCTURES, type StructurePreferences } from '@/structures';

interface StructureContextType {
  structure: StructureName;
  setStructure: (s: StructureName) => void;
  preferences: StructurePreferences;
}

const StructureContext = createContext<StructureContextType | undefined>(undefined);

const STORAGE_KEY = 'arkade-explorer-structure';

export function StructureProvider({ children }: { children: ReactNode }) {
  const [structure, setStructureState] = useState<StructureName>('classic');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as StructureName | null;
    if (stored && stored in STRUCTURES) {
      setStructureState(stored);
    }
  }, []);

  const setStructure = (s: StructureName) => {
    setStructureState(s);
    localStorage.setItem(STORAGE_KEY, s);
  };

  const def = STRUCTURES[structure];

  return (
    <StructureContext.Provider value={{
      structure,
      setStructure,
      preferences: def.preferences,
    }}>
      {children}
    </StructureContext.Provider>
  );
}

export function useStructure() {
  const ctx = useContext(StructureContext);
  if (!ctx) throw new Error('useStructure must be used within StructureProvider');
  return ctx;
}
