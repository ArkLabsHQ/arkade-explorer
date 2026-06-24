import { describe, it, expect } from 'vitest';
import type { VirtualCoin, PageResponse } from '@arkade-os/sdk';
import {
  isVtxoActive,
  sumVtxoValue,
  sumActiveVtxoValue,
  aggregateAssetBalances,
  hasMorePages,
} from '@/lib/vtxo-aggregation';

function makeVtxo(p: Partial<VirtualCoin> & { value: number }): VirtualCoin {
  return {
    txid: 't',
    vout: 0,
    spentBy: '',
    isSpent: false,
    assets: [],
    ...p,
  } as unknown as VirtualCoin;
}

const page = (p: Partial<PageResponse>): PageResponse =>
  ({ current: 0, next: 0, total: 0, ...p }) as PageResponse;

describe('isVtxoActive', () => {
  it('is active when not spent', () => {
    expect(isVtxoActive(makeVtxo({ value: 1 }))).toBe(true);
  });
  it('is inactive when spentBy is set', () => {
    expect(isVtxoActive(makeVtxo({ value: 1, spentBy: 'abc' }))).toBe(false);
  });
  it('is inactive when isSpent is true', () => {
    expect(isVtxoActive(makeVtxo({ value: 1, isSpent: true }))).toBe(false);
  });
});

describe('sumVtxoValue / sumActiveVtxoValue', () => {
  const vtxos = [
    makeVtxo({ value: 100 }),
    makeVtxo({ value: 200, spentBy: 'x' }),
    makeVtxo({ value: 300 }),
  ];
  it('sumVtxoValue sums every vtxo (total received)', () => {
    expect(sumVtxoValue(vtxos)).toBe(600);
  });
  it('sumActiveVtxoValue sums only active vtxos (balance)', () => {
    expect(sumActiveVtxoValue(vtxos)).toBe(400);
  });
  it('returns 0 for an empty list', () => {
    expect(sumVtxoValue([])).toBe(0);
    expect(sumActiveVtxoValue([])).toBe(0);
  });
});

describe('aggregateAssetBalances', () => {
  it('aggregates active vs total per asset id across the full set', () => {
    const vtxos = [
      makeVtxo({ value: 0, assets: [{ assetId: 'A', amount: 10 }] as VirtualCoin['assets'] }),
      makeVtxo({ value: 0, spentBy: 'x', assets: [{ assetId: 'A', amount: 5 }] as VirtualCoin['assets'] }),
      makeVtxo({ value: 0, assets: [{ assetId: 'B', amount: 7 }] as VirtualCoin['assets'] }),
    ];
    const result = aggregateAssetBalances(vtxos);
    expect(result.get('A')).toEqual({ active: 10, total: 15 });
    expect(result.get('B')).toEqual({ active: 7, total: 7 });
  });
});

describe('hasMorePages', () => {
  it('is false when page is undefined', () => {
    expect(hasMorePages(undefined)).toBe(false);
  });
  it('is false when next <= current', () => {
    expect(hasMorePages(page({ current: 2, next: 2 }))).toBe(false);
  });
  it('is false when current is the last index (total is a page count)', () => {
    expect(hasMorePages(page({ current: 4, next: 5, total: 5 }))).toBe(false);
  });
  it('is true when more pages remain', () => {
    expect(hasMorePages(page({ current: 0, next: 1, total: 5 }))).toBe(true);
  });
});
