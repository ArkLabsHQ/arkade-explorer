import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { arkClient } from '../lib/api/indexer';
import type { ArkInfo } from '@arkade-os/sdk';

const ServerInfoContext = createContext<{
  serverInfo: ArkInfo | null;
  isLoading: boolean;
  error: Error | null;
}>({
  serverInfo: null,
  isLoading: true,
  error: null,
});

export function ServerInfoProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['server-info'],
    queryFn: async () => {
      const info = await arkClient.getInfo();
      return info;
    },
    staleTime: Infinity, // Server info doesn't change
    retry: 3,
  });

  return (
    <ServerInfoContext.Provider
      value={{
        serverInfo: data || null,
        isLoading,
        error: error as Error | null,
      }}
    >
      {children}
    </ServerInfoContext.Provider>
  );
}

export function useServerInfo() {
  return useContext(ServerInfoContext);
}
