import {
  RestIndexerProvider,
  RestArkProvider,
  type VirtualCoin,
  type Outpoint,
  type PageResponse,
  type PaginationOptions,
} from '@arkade-os/sdk';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || 'https://arkade.computer';
const ARK_URL = import.meta.env.VITE_ARK_URL || 'https://arkade.computer';

// ---------------------------------------------------------------------------
// Local asset types (matching what PR #279 will eventually add to the SDK)
// ---------------------------------------------------------------------------

/** A single asset attached to a VTXO. */
export interface Asset {
  assetId: string;
  amount: number;
}

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
export interface AssetDetails {
  assetId: string;
  supply: number;
  metadata?: AssetMetadata;
  controlAssetId?: string;
}

/** A VirtualCoin extended with an optional `assets` array. */
export type VtxoWithAssets = VirtualCoin & { assets?: Asset[] };

// ---------------------------------------------------------------------------
// Raw types for the REST API responses
// ---------------------------------------------------------------------------

interface RawIndexerAsset {
  assetId: string;
  amount: number | string;
}

interface RawVtxo {
  outpoint: Outpoint;
  createdAt: string;
  expiresAt: string | null;
  amount: string;
  script: string;
  isPreconfirmed: boolean;
  isSwept: boolean;
  isUnrolled: boolean;
  isSpent: boolean;
  spentBy: string | null;
  commitmentTxids: string[];
  settledBy?: string;
  arkTxid?: string;
  assets?: RawIndexerAsset[];
}

interface RawAssetMetadataEntry {
  key: string;
  value: string;
}

interface RawAssetDetails {
  assetId: string;
  supply: string;
  controlAsset?: string;
  metadata?: RawAssetMetadataEntry[];
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function convertAsset(raw: RawIndexerAsset): Asset {
  return {
    assetId: raw.assetId,
    amount: typeof raw.amount === 'string' ? Number(raw.amount) : raw.amount,
  };
}

function convertVtxo(vtxo: RawVtxo): VtxoWithAssets {
  return {
    txid: vtxo.outpoint.txid,
    vout: vtxo.outpoint.vout,
    value: Number(vtxo.amount),
    status: {
      confirmed: !vtxo.isSwept && !vtxo.isPreconfirmed,
    },
    virtualStatus: {
      state: vtxo.isSwept
        ? 'swept'
        : vtxo.isPreconfirmed
          ? 'preconfirmed'
          : 'settled',
      commitmentTxIds: vtxo.commitmentTxids,
      batchExpiry: vtxo.expiresAt
        ? Number(vtxo.expiresAt) * 1000
        : undefined,
    },
    spentBy: vtxo.spentBy ?? '',
    settledBy: vtxo.settledBy,
    arkTxId: vtxo.arkTxid,
    createdAt: new Date(Number(vtxo.createdAt) * 1000),
    isUnrolled: vtxo.isUnrolled,
    isSpent: vtxo.isSpent,
    assets: vtxo.assets ? vtxo.assets.map(convertAsset) : undefined,
  };
}

/** Decode a hex-encoded string to UTF-8. */
function hexToString(hex: string): string {
  const bytes = new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  );
  return new TextDecoder().decode(bytes);
}

function parseAssetMetadata(
  rawEntries: RawAssetMetadataEntry[] | undefined,
): AssetMetadata | undefined {
  if (!rawEntries || rawEntries.length === 0) return undefined;

  const metadata: AssetMetadata = {};
  for (const entry of rawEntries) {
    const key = hexToString(entry.key);
    const value = hexToString(entry.value);
    if (key === 'decimals') {
      metadata.decimals = Number(value);
    } else {
      metadata[key] = value;
    }
  }
  return metadata;
}

function isVtxosResponse(
  _: unknown,
): _ is { vtxos: RawVtxo[]; page?: PageResponse } {
  return (
    typeof _ === 'object' &&
    _ !== null &&
    'vtxos' in _ &&
    Array.isArray((_ as { vtxos: unknown }).vtxos)
  );
}

// ---------------------------------------------------------------------------
// AssetIndexerClient – extends RestIndexerProvider with asset awareness
// ---------------------------------------------------------------------------

export class AssetIndexerClient extends RestIndexerProvider {
  constructor(url: string) {
    super(url);
  }

  /**
   * Override getVtxos to call the REST API directly and parse the `assets`
   * array from the raw response.
   */
  async getVtxos(
    opts?: PaginationOptions & {
      scripts?: string[];
      outpoints?: Outpoint[];
      spendableOnly?: boolean;
      spentOnly?: boolean;
      recoverableOnly?: boolean;
    },
  ): Promise<{ vtxos: VtxoWithAssets[]; page?: PageResponse | undefined }> {
    // scripts and outpoints are mutually exclusive
    if (opts?.scripts && opts?.outpoints) {
      throw new Error('scripts and outpoints are mutually exclusive options');
    }

    if (!opts?.scripts && !opts?.outpoints) {
      throw new Error('Either scripts or outpoints must be provided');
    }

    let url = `${this.serverUrl}/v1/indexer/vtxos`;
    const params = new URLSearchParams();

    if (opts?.scripts && opts.scripts.length > 0) {
      opts.scripts.forEach((script) => {
        params.append('scripts', script);
      });
    }

    if (opts?.outpoints && opts.outpoints.length > 0) {
      opts.outpoints.forEach((outpoint) => {
        params.append('outpoints', `${outpoint.txid}:${outpoint.vout}`);
      });
    }

    if (opts) {
      if (opts.spendableOnly !== undefined)
        params.append('spendableOnly', opts.spendableOnly.toString());
      if (opts.spentOnly !== undefined)
        params.append('spentOnly', opts.spentOnly.toString());
      if (opts.recoverableOnly !== undefined)
        params.append('recoverableOnly', opts.recoverableOnly.toString());
      if (opts.pageIndex !== undefined)
        params.append('page.index', opts.pageIndex.toString());
      if (opts.pageSize !== undefined)
        params.append('page.size', opts.pageSize.toString());
    }

    if (params.toString()) {
      url += '?' + params.toString();
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch vtxos: ${res.statusText}`);
    }

    const data = await res.json();
    if (!isVtxosResponse(data)) {
      throw new Error('Invalid vtxos data received');
    }

    return {
      vtxos: data.vtxos.map(convertVtxo),
      page: data.page,
    };
  }

  /**
   * Fetch details for a specific asset, including decoded metadata.
   */
  async getAssetDetails(assetId: string): Promise<AssetDetails> {
    const url = `${this.serverUrl}/v1/indexer/asset/${assetId}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch asset details: ${res.statusText}`);
    }

    const data: RawAssetDetails = await res.json();

    return {
      assetId: data.assetId,
      supply: Number(data.supply),
      metadata: parseAssetMetadata(data.metadata),
      controlAssetId: data.controlAsset,
    };
  }
}

// ---------------------------------------------------------------------------
// Exported clients
// ---------------------------------------------------------------------------

export const indexerClient = new AssetIndexerClient(INDEXER_URL);
export const arkClient = new RestArkProvider(ARK_URL);

// ---------------------------------------------------------------------------
// Re-exports from SDK for convenience
// ---------------------------------------------------------------------------

export type { Outpoint, CommitmentTx, BatchInfo, PageResponse, VirtualCoin } from '@arkade-os/sdk';

// Alias BatchInfo as Batch for backward compatibility
export type { BatchInfo as Batch } from '@arkade-os/sdk';

// Alias VtxoWithAssets as Vtxo so existing code gains the assets field
export type Vtxo = VtxoWithAssets;
