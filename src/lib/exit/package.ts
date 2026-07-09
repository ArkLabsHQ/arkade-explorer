import { deserializeExitPackage, type ExitPackage } from '@arkade-os/sdk';

/**
 * Decode a URL-safe base64 string to bytes. Accepts padded or unpadded, and
 * both the URL alphabet (`-_`) and standard (`+/`).
 */
function base64urlToBytes(s: string): Uint8Array {
  const std = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = std + '='.repeat((4 - (std.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  // Copy into a fresh ArrayBuffer-backed view so the type is concrete.
  void writer.write(new Uint8Array(bytes));
  void writer.close();
  return await new Response(ds.readable).text();
}

/**
 * Parse raw text as an exit package. Validation (version, step shapes) is
 * delegated to the SDK's `deserializeExitPackage`, the single source of truth
 * for the format — this app never re-implements it.
 */
export function parsePackageJson(text: string): ExitPackage {
  return deserializeExitPackage(text);
}

/**
 * Decode a package from a transport blob that may be:
 *   1. raw JSON,
 *   2. base64url(JSON), or
 *   3. base64url(gzip(JSON)) — the compact form used in share links.
 * Tries the cheapest interpretation first and falls through.
 */
export async function decodePackageBlob(blob: string): Promise<ExitPackage> {
  const trimmed = blob.trim();

  if (trimmed.startsWith('{')) {
    return parsePackageJson(trimmed);
  }

  const bytes = base64urlToBytes(trimmed);

  // gzip magic bytes 0x1f 0x8b -> decompress
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return parsePackageJson(await gunzip(bytes));
  }

  return parsePackageJson(new TextDecoder().decode(bytes));
}

/**
 * Extract a package payload from a URL, if present. Prefers the fragment
 * (`#pkg=…`) — it never reaches server logs — and falls back to the query
 * string (`?pkg=…`).
 */
export function packageParamFromUrl(url: URL): string | null {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return hash.get('pkg') ?? url.searchParams.get('pkg');
}

export async function readFileText(file: File): Promise<string> {
  return await file.text();
}
