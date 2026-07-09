import { deserializeExitPackage, type ExitPackage } from '@arkade-os/sdk';

/**
 * A decoded package plus any transport-level extras the explorer layers on top
 * of the SDK format. `feeKeyHex` is present only for a graph-mode *bundle*
 * exported with its ephemeral fee key embedded (see {@link encodeExitBundle}) —
 * such a bundle is self-executable and needs no re-funding.
 */
export interface LoadedPackage {
  pkg: ExitPackage;
  feeKeyHex?: string;
}

/** Marker on the explorer's self-executable envelope (distinguishes it from a bare package). */
const BUNDLE_MARKER = 'arkadeExitBundle';
const FEE_KEY_RE = /^[0-9a-f]{64}$/;

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
 * Interpret already-parsed JSON as either the explorer's self-executable
 * bundle (envelope with an embedded fee key) or a bare SDK exit package.
 * Either way the package itself is validated by the SDK — the single source of
 * truth for the format.
 */
function fromParsedJson(text: string): LoadedPackage {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('not valid JSON');
  }
  if (obj && typeof obj === 'object' && BUNDLE_MARKER in obj) {
    const bundle = obj as { pkg?: unknown; feeKeyHex?: unknown };
    const pkg = deserializeExitPackage(JSON.stringify(bundle.pkg));
    const feeKeyHex =
      typeof bundle.feeKeyHex === 'string' && FEE_KEY_RE.test(bundle.feeKeyHex)
        ? bundle.feeKeyHex
        : undefined;
    return { pkg, feeKeyHex };
  }
  return { pkg: deserializeExitPackage(text) };
}

/**
 * Parse raw text as an exit package (bare or bundled). Package validation is
 * delegated to the SDK's `deserializeExitPackage`; this app never re-implements
 * the format.
 */
export function parsePackageJson(text: string): LoadedPackage {
  return fromParsedJson(text);
}

/**
 * Decode a package from a transport blob that may be:
 *   1. raw JSON (bare package or `{arkadeExitBundle}` envelope),
 *   2. base64url(JSON), or
 *   3. base64url(gzip(JSON)) — the compact form used in share links.
 * Tries the cheapest interpretation first and falls through.
 */
export async function decodePackageBlob(blob: string): Promise<LoadedPackage> {
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
 * Serialize a package for export. With a `feeKeyHex` it produces the explorer's
 * self-executable bundle — the graph-mode equivalent of a fully-signed funded
 * package: the recipient can run it standalone against the already-funded fee
 * address, with no key of their own and no re-funding. Without a key it emits
 * the bare SDK package (unchanged transport).
 *
 * The embedded key is an ephemeral fee-only key; anyone with the bundle can
 * spend its small fee remainder, so treat the exported file as sensitive.
 */
export function encodeExitBundle(pkg: ExitPackage, feeKeyHex?: string): string {
  const body =
    feeKeyHex && FEE_KEY_RE.test(feeKeyHex)
      ? { [BUNDLE_MARKER]: 1 as const, pkg, feeKeyHex }
      : pkg;
  return JSON.stringify(body, null, 2);
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
