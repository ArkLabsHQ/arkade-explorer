import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { indexerClient } from '../lib/api/indexer';

interface ServerInfo {
  signerPubkey: string;
  forfeitPubkey: string;
  roundLifetime: number;
  unilateralExitDelay: number;
  roundInterval: number;
  network: string;
  dust: number;
  boardingDescriptorTemplate: string;
  vtxoDescriptorTemplates: string[];
}

interface ServerInfoContextType {
  serverInfo: ServerInfo | null;
  isLoading: boolean;
  error: Error | null;
}

const ServerInfoContext = createContext<ServerInfoContextType>({
  serverInfo: null,
  isLoading: true,
  error: null,
});

export function ServerInfoProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['server-info'],
    queryFn: async () => {
      const info = await indexerClient.getInfo();
      return info as ServerInfo;
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
