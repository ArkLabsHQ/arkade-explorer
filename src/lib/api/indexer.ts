import { RestIndexerProvider, RestArkProvider } from "@arkade-os/sdk";

export const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || "https://arkade.computer";
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
    if (url.startsWith("data:image/")) return true;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
    } catch {
        return false;
    }
}

export { formatAssetAmount } from "@/lib/formatters";

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
} from "@arkade-os/sdk";

export type { BatchInfo as Batch } from "@arkade-os/sdk";
export type { VirtualCoin as Vtxo } from "@arkade-os/sdk";
