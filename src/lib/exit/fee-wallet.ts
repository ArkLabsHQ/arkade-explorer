import {
  EsploraProvider,
  OnchainWallet,
  SingleKey,
  type ExitFeeWallet,
  type NetworkName,
} from '@arkade-os/sdk';

const STORAGE_KEY = 'arkade-exit:fee-key';

function randomPrivKeyHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The graph-mode fee key is an EPHEMERAL, throwaway key this browser owns. It
 * only ever holds the sats sent to cover CPFP fees — never any VTXO value — so
 * persisting it to localStorage is low-risk and buys recoverability: reloading
 * the tab mid-exit resumes with the same funded address instead of stranding
 * the deposit. Losing it entirely only forfeits the small unspent fee
 * remainder; the exit itself is idempotent and re-fundable with a fresh key.
 */
export function loadOrCreateFeeKey(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;
  const fresh = randomPrivKeyHex();
  localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

export function resetFeeKey(): string {
  localStorage.removeItem(STORAGE_KEY);
  return loadOrCreateFeeKey();
}

export interface FeeWalletHandle {
  address: string;
  privKeyHex: string;
  confirmedBalance(): Promise<number>;
  wallet: OnchainWallet & ExitFeeWallet;
}

/**
 * Build an ephemeral fee wallet bound to the given network + Esplora endpoint.
 * `OnchainWallet` already implements {@link ExitFeeWallet} via `bumpAnchor`, so
 * the executor can use it directly.
 */
export async function makeFeeWallet(
  privKeyHex: string,
  network: string,
  esploraUrl: string,
): Promise<FeeWalletHandle> {
  const identity = SingleKey.fromHex(privKeyHex);
  const provider = new EsploraProvider(esploraUrl);
  const wallet = await OnchainWallet.create(identity, network as NetworkName, provider);
  return {
    address: wallet.address,
    privKeyHex,
    wallet,
    async confirmedBalance() {
      const coins = await wallet.getCoins();
      return coins.filter((c) => c.status.confirmed).reduce((sum, c) => sum + c.value, 0);
    },
  };
}
