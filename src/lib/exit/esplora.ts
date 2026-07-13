import { ESPLORA_URL, type NetworkName } from '@arkade-os/sdk';

/**
 * Resolve the onchain Esplora REST endpoint for the exit executor. Prefers an
 * explicit `VITE_ESPLORA_URL` override, otherwise falls back to the SDK's
 * per-network default (arkade.sh / mempool.space). The network is read from
 * the Ark server info at runtime, matching how the rest of the explorer keys
 * off `serverInfo.network`.
 */
export function esploraUrlFor(network: string | undefined): string {
  const override = import.meta.env.VITE_ESPLORA_URL;
  if (override) return override;
  return ESPLORA_URL[(network ?? 'bitcoin') as NetworkName] ?? ESPLORA_URL.bitcoin;
}
