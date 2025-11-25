import { RestIndexerProvider, RestArkProvider, type VirtualCoin } from '@arkade-os/sdk';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || 'https://arkade.computer';
const ARK_URL = import.meta.env.VITE_ARK_URL || 'https://arkade.computer';

// Extend the provider to add custom methods
class ExtendedIndexerProvider extends RestIndexerProvider {
  async getInfo() {
    const url = `${this.serverUrl}/v1/info`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch server info: ${res.statusText}`);
    return await res.json();
  }
}

export const indexerClient = new ExtendedIndexerProvider(INDEXER_URL);
export const arkClient = new RestArkProvider(ARK_URL);

// Re-export types from SDK for convenience
export type { Outpoint, CommitmentTx, Batch, PageResponse, VirtualCoin } from '@arkade-os/sdk';

// Alias VirtualCoin as Vtxo for backward compatibility
export type Vtxo = VirtualCoin;
