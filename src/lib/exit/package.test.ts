import { describe, expect, it } from 'vitest';
import type { ExitPackage } from '@arkade-os/sdk';
import { decodePackageBlob, packageParamFromUrl } from './package';

const pkg: ExitPackage = {
  version: 1,
  mode: 'funded',
  network: 'bitcoin',
  createdAt: 1720000000,
  feeRate: 2,
  sweepAddress: 'bc1pexample',
  totals: { txCount: 1, totalFeeSats: 100, fundingRequiredSats: 200, recoveredSats: 900 },
  vtxos: [{ outpoint: 'aa'.repeat(32) + ':0', value: 1000, sweepFee: 100 }],
  steps: [{ kind: 'broadcast', txid: 'cc'.repeat(32), hex: '02000000' }],
};

const json = JSON.stringify(pkg);

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function gzipToBase64url(text: string): Promise<string> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  void writer.write(new TextEncoder().encode(text));
  void writer.close();
  const bytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
  return bytesToBase64url(bytes);
}

describe('decodePackageBlob', () => {
  it('decodes raw JSON', async () => {
    expect(await decodePackageBlob(json)).toEqual(pkg);
  });

  it('decodes base64url(JSON)', async () => {
    const b64 = bytesToBase64url(new TextEncoder().encode(json));
    expect(await decodePackageBlob(b64)).toEqual(pkg);
  });

  it('decodes base64url(gzip(JSON)) — the share-link form', async () => {
    const blob = await gzipToBase64url(json);
    expect(await decodePackageBlob(blob)).toEqual(pkg);
  });

  it('rejects an unknown version via the SDK validator', async () => {
    const bad = JSON.stringify({ ...pkg, version: 2 });
    await expect(decodePackageBlob(bad)).rejects.toThrow(/version/i);
  });
});

describe('packageParamFromUrl', () => {
  it('prefers the #fragment over the query string', () => {
    const url = new URL('https://x.io/?pkg=QUERY#pkg=FRAGMENT');
    expect(packageParamFromUrl(url)).toBe('FRAGMENT');
  });

  it('falls back to the query string', () => {
    const url = new URL('https://x.io/?pkg=QUERY');
    expect(packageParamFromUrl(url)).toBe('QUERY');
  });

  it('returns null when absent', () => {
    expect(packageParamFromUrl(new URL('https://x.io/'))).toBeNull();
  });
});
