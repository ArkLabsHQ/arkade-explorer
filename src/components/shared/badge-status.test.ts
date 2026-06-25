import { describe, it, expect } from 'vitest';
import { deriveVtxoStatus } from '@/components/shared/badge-status';

const base = { txid: 'aa', vout: 0 };

describe('deriveVtxoStatus', () => {
  it('is spendable when not spent', () => {
    expect(deriveVtxoStatus({ ...base })).toBe('spendable');
  });

  it('is spent when isSpent is true and no pending set is given', () => {
    expect(deriveVtxoStatus({ ...base, isSpent: true })).toBe('spent');
  });

  it('is spent when spentBy is set', () => {
    expect(deriveVtxoStatus({ ...base, spentBy: 'bb' })).toBe('spent');
  });

  it('is unfinalized when spent and the outpoint is in the pending set', () => {
    const pending = new Set(['aa:0']);
    expect(deriveVtxoStatus({ ...base, isSpent: true }, pending)).toBe('unfinalized');
  });

  it('stays spent when spent but the outpoint is NOT in the pending set', () => {
    const pending = new Set(['cc:1']);
    expect(deriveVtxoStatus({ ...base, isSpent: true }, pending)).toBe('spent');
  });

  it('never marks an unspent VTXO unfinalized, even if its outpoint is in the set', () => {
    const pending = new Set(['aa:0']); // a preconfirmed-but-unspent VTXO can appear here
    expect(deriveVtxoStatus({ ...base }, pending)).toBe('spendable');
  });
});
