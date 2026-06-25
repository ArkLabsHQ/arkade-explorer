import { describe, it, expect } from 'vitest';
import { hex } from '@scure/base';
import { deriveOutputDisplayAddress } from '@/lib/arkAddress';

// Real checkpoint output script (0889…:0) + live mainnet signerPubkey.
const CHECKPOINT_SCRIPT = hex.decode(
  '5120d414e9e83c923e2ddf3335d66f59619c8d39665875a18ba9766bbf122218399f',
);
const SIGNER = '038202bebddeb1f7442803897a85eaf3ce9254d07df0172fc3725ab5f0d097779c';

describe('deriveOutputDisplayAddress', () => {
  it('renders checkpoint outputs as Arkade addresses (the bug fix)', () => {
    const addr = deriveOutputDisplayAddress(CHECKPOINT_SCRIPT, {
      type: 'arkade', subtype: 'checkpoint', network: 'bitcoin', signerPubkey: SIGNER,
    });
    expect(addr.startsWith('ark1')).toBe(true);
  });

  it('renders commitment outputs as onchain addresses', () => {
    const addr = deriveOutputDisplayAddress(CHECKPOINT_SCRIPT, {
      type: 'commitment', subtype: 'generic', network: 'bitcoin', signerPubkey: SIGNER,
    });
    expect(addr.startsWith('bc1')).toBe(true);
  });

  it('keeps connector-tree outputs onchain', () => {
    const addr = deriveOutputDisplayAddress(CHECKPOINT_SCRIPT, {
      type: 'arkade', subtype: 'connector-tree', network: 'bitcoin', signerPubkey: SIGNER,
    });
    expect(addr.startsWith('bc1')).toBe(true);
  });
});
