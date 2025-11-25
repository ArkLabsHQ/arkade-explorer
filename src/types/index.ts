export interface Outpoint {
  txid: string;
  vout: number;
}

export interface Vtxo {
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
}

export interface Batch {
  totalOutputAmount: string;
  totalOutputVtxos: number;
  expiresAt: string;
  swept: boolean;
}

export interface CommitmentTx {
  startedAt: string;
  endedAt: string;
  batches: { [key: string]: Batch };
  totalInputAmount: string;
  totalInputVtxos: number;
  totalOutputAmount: string;
  totalOutputVtxos: number;
}

export interface PageResponse {
  current: number;
  next: number;
  total: number;
}
