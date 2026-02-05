import { RestIndexerProvider, RestArkProvider, type VirtualCoin, Outpoint, PageResponse, PaginationOptions } from '@arkade-os/sdk';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || 'https://arkade.computer';
const ARK_URL = import.meta.env.VITE_ARK_URL || 'https://arkade.computer';

/** Asset on a VTXO (indexer extension; can be empty) */
export interface IndexerAsset {
  assetId: string;
  amount: number;
}

export type VtxoWithAssets = VirtualCoin & { assets: IndexerAsset[] };

///// TEMPORARY ////
// TODO : temporary overwrite to add assets to vtxo response, remove once ts-sdk is updated
export class WithAssetIndexerClient extends RestIndexerProvider {
  constructor(url: string) {
    super(url);
  }

  async getVtxos(opts?: PaginationOptions & {
    scripts?: string[];
    outpoints?: Outpoint[];
    spendableOnly?: boolean;
    spentOnly?: boolean;
    recoverableOnly?: boolean;
  }): Promise<{ vtxos: VtxoWithAssets[]; page?: PageResponse | undefined }> {
      // scripts and outpoints are mutually exclusive
      if (opts?.scripts && opts?.outpoints) {
          throw new Error(
              "scripts and outpoints are mutually exclusive options"
          );
      }

      if (!opts?.scripts && !opts?.outpoints) {
          throw new Error("Either scripts or outpoints must be provided");
      }

      let url = `${this.serverUrl}/v1/indexer/vtxos`;
      const params = new URLSearchParams();

      // Handle scripts with multi collection format
      if (opts?.scripts && opts.scripts.length > 0) {
          opts.scripts.forEach((script) => {
              params.append("scripts", script);
          });
      }

      // Handle outpoints with multi collection format
      if (opts?.outpoints && opts.outpoints.length > 0) {
          opts.outpoints.forEach((outpoint) => {
              params.append("outpoints", `${outpoint.txid}:${outpoint.vout}`);
          });
      }

      if (opts) {
          if (opts.spendableOnly !== undefined)
              params.append("spendableOnly", opts.spendableOnly.toString());
          if (opts.spentOnly !== undefined)
              params.append("spentOnly", opts.spentOnly.toString());
          if (opts.recoverableOnly !== undefined)
              params.append(
                  "recoverableOnly",
                  opts.recoverableOnly.toString()
              );
          if (opts.pageIndex !== undefined)
              params.append("page.index", opts.pageIndex.toString());
          if (opts.pageSize !== undefined)
              params.append("page.size", opts.pageSize.toString());
      }
      if (params.toString()) {
          url += "?" + params.toString();
      }
      const res = await fetch(url);
      if (!res.ok) {
          throw new Error(`Failed to fetch vtxos: ${res.statusText}`);
      }
      const data = await res.json();
      if (!isVtxosResponse(data)) {
          throw new Error("Invalid vtxos data received");
      }
      return {
          vtxos: data.vtxos.map(convertVtxo),
          page: data.page,
      };
  }
}

function convertAsset(raw: RawIndexerAsset): IndexerAsset {
  return {
    assetId: raw.assetId,
    amount: typeof raw.amount === 'string' ? Number(raw.amount) : raw.amount,
  };
}

function convertVtxo(vtxo: RawVtxo): VtxoWithAssets {
  if (typeof vtxo !== 'object' || vtxo === null) {
    throw new Error('Invalid vtxo data');
  }
  return {
      txid: vtxo.outpoint.txid,
      vout: vtxo.outpoint.vout,
      value: Number(vtxo.amount),
      status: {
          confirmed: !vtxo.isSwept && !vtxo.isPreconfirmed,
      },
      virtualStatus: {
          state: vtxo.isSwept
              ? "swept"
              : vtxo.isPreconfirmed
                ? "preconfirmed"
                : "settled",
          commitmentTxIds: vtxo.commitmentTxids,
          batchExpiry: vtxo.expiresAt
              ? Number(vtxo.expiresAt) * 1000
              : undefined,
      },
      spentBy: vtxo.spentBy ?? "",
      settledBy: vtxo.settledBy,
      arkTxId: vtxo.arkTxid,
      createdAt: new Date(Number(vtxo.createdAt) * 1000),
      isUnrolled: vtxo.isUnrolled,
      isSpent: vtxo.isSpent,
      assets: (vtxo.assets ?? []).map(convertAsset),
  };
}

interface RawIndexerAsset {
  amount: number | string;
  assetId: string;
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

function isVtxosResponse(
  _: unknown
): _ is { vtxos: RawVtxo[]; page?: PageResponse } {
  return true;
}
///// TEMPORARY ////

export const indexerClient = new WithAssetIndexerClient(INDEXER_URL);
export const arkClient = new RestArkProvider(ARK_URL);

// Re-export types from SDK for convenience
export type { Outpoint, CommitmentTx, BatchInfo, PageResponse, VirtualCoin } from '@arkade-os/sdk';

// Alias BatchInfo as Batch for backward compatibility
export type { BatchInfo as Batch } from '@arkade-os/sdk';

// Alias VirtualCoin as Vtxo for backward compatibility
export type Vtxo = VirtualCoin;

