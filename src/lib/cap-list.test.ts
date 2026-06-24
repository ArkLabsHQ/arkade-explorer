import { describe, it, expect } from 'vitest';
import { capList } from '@/lib/cap-list';

describe('capList', () => {
  it('shows everything when under the cap', () => {
    expect(capList([1, 2, 3], 5, false)).toEqual({ visible: [1, 2, 3], hiddenCount: 0 });
  });
  it('caps and reports the hidden count when over and collapsed', () => {
    expect(capList([1, 2, 3, 4, 5], 2, false)).toEqual({ visible: [1, 2], hiddenCount: 3 });
  });
  it('shows everything when expanded, even over the cap', () => {
    expect(capList([1, 2, 3, 4, 5], 2, true)).toEqual({ visible: [1, 2, 3, 4, 5], hiddenCount: 0 });
  });
  it('handles an exact-cap boundary with nothing hidden', () => {
    expect(capList([1, 2], 2, false)).toEqual({ visible: [1, 2], hiddenCount: 0 });
  });
});
