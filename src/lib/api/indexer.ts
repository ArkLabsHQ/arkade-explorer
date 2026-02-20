import { RestIndexerProvider, RestArkProvider } from '@arkade-os/sdk';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || 'https://arkade.computer';
const ARK_URL = import.meta.env.VITE_ARK_URL || INDEXER_URL;

// ---------------------------------------------------------------------------
// Asset metadata types (not yet exported from SDK top-level)
// ---------------------------------------------------------------------------

/** Well-known metadata fields that may appear on an asset. */
export type KnownMetadata = Partial<{
  name: string;
  ticker: string;
  decimals: number;
  icon: string;
}>;

/** Full asset metadata: known fields plus any arbitrary key-value pairs. */
export type AssetMetadata = KnownMetadata & Record<string, unknown>;

/** Details returned by the `/v1/indexer/asset/:assetId` endpoint. */
export type AssetDetails = {
  assetId: string;
  supply: number;
  metadata?: AssetMetadata;
  controlAssetId?: string;
};

// ---------------------------------------------------------------------------
// Exported clients
// ---------------------------------------------------------------------------

export const indexerClient = new RestIndexerProvider(INDEXER_URL);
export const arkClient = new RestArkProvider(ARK_URL);

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Validate that an image URL is safe to render in an <img> tag. */
export function isSafeImageUrl(url: string): boolean {
  // Allow base64-encoded images (data:image/png;base64,... etc.)
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format an asset amount using string-based decimal placement to avoid
 * floating-point precision loss with large values or high decimal counts.
 */
export function formatAssetAmount(amount: number, decimals: number): string {
  if (decimals === 0) return amount.toLocaleString('en-US');
  const amountStr = amount.toString();
  const padded = amountStr.padStart(decimals + 1, '0');
  const intPart = padded.slice(0, padded.length - decimals);
  const decPart = padded.slice(padded.length - decimals);
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formattedInt}.${decPart}`;
}

// ---------------------------------------------------------------------------
// Re-exports from SDK for convenience
// ---------------------------------------------------------------------------

export type {
  Outpoint,
  CommitmentTx,
  BatchInfo,
  PageResponse,
  VirtualCoin,
  Asset,
} from '@arkade-os/sdk';

// Alias BatchInfo as Batch for backward compatibility
export type { BatchInfo as Batch } from '@arkade-os/sdk';

// Alias VirtualCoin as Vtxo — VirtualCoin now includes assets natively
export type { VirtualCoin as Vtxo } from '@arkade-os/sdk';
