import { ArkAddress } from '@arkade-os/sdk';
import { hex } from '@scure/base';

const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot|Slack-ImgProxy|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|yandex|Embedly|showyoubot|outbrain|pinterest|vkShare|W3C_Validator|Iframely/i;

const DEFAULT_INDEXER = 'https://indexer.arkadeos.com';

function truncate(str, start = 8, end = 8) {
  if (!str || str.length <= start + end + 3) return str || '';
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function formatSats(satsBigInt) {
  const str = satsBigInt.toString();
  const padded = str.padStart(9, '0'); // at least 1 digit before decimal
  const intPart = padded.slice(0, padded.length - 8);
  const decPart = padded.slice(padded.length - 8).replace(/0+$/, '');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${formattedInt}.${decPart} BTC` : `${formattedInt} BTC`;
}

function formatAmount(amount, decimals) {
  if (decimals === 0) return BigInt(amount).toLocaleString('en-US');
  const str = BigInt(amount).toString();
  const padded = str.padStart(decimals + 1, '0');
  const intPart = padded.slice(0, padded.length - decimals);
  const decPart = padded.slice(padded.length - decimals).replace(/0+$/, '');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

/** Convert a tark1/ark1 address to its script hex for the indexer API */
function addressToScriptHex(address) {
  // If already hex, return as-is
  if (/^[0-9a-fA-F]+$/.test(address) && address.length % 2 === 0) {
    return address.toLowerCase();
  }
  const decoded = ArkAddress.decode(address);
  return hex.encode(decoded.pkScript);
}

/** Fetch JSON from the indexer, with a timeout */
async function indexerFetch(indexerUrl, path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${indexerUrl}${path}`, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch address balances: total sats + asset count */
async function getAddressMeta(indexerUrl, address) {
  try {
    const scriptHex = addressToScriptHex(address);
    const data = await indexerFetch(indexerUrl, `/v1/indexer/vtxos?scripts=${scriptHex}`);
    if (!data?.vtxos) return null;

    const vtxos = data.vtxos;
    let totalSats = 0n;
    let activeCount = 0;
    const assetIds = new Set();

    for (const v of vtxos) {
      if (!v.spent) {
        totalSats += BigInt(v.amount || 0);
        activeCount++;
      }
      if (v.assets) {
        for (const a of v.assets) {
          if (a.id) assetIds.add(a.id);
        }
      }
    }

    const parts = [`Balance: ${formatSats(totalSats)}`, `${activeCount} active VTXOs`];
    if (assetIds.size > 0) parts.push(`${assetIds.size} asset${assetIds.size > 1 ? 's' : ''}`);
    return parts.join(' | ');
  } catch {
    return null;
  }
}

/** Fetch asset details: name, ticker, supply */
async function getAssetMeta(indexerUrl, assetId) {
  try {
    const data = await indexerFetch(indexerUrl, `/v1/indexer/asset/${encodeURIComponent(assetId)}`);
    if (!data) return null;

    const name = data.metadata?.name;
    const ticker = data.metadata?.ticker;
    const supply = data.supply;
    const decimals = data.metadata?.decimals || 0;

    const label = ticker || name || truncate(assetId);
    const parts = [label];
    if (supply != null) {
      const formatted = formatAmount(supply, decimals);
      parts.push(`Supply: ${formatted}`);
    }
    if (name && ticker) parts.push(name);
    return { title: `${label} | Arkade Explorer`, description: parts.join(' | ') };
  } catch {
    return null;
  }
}

/** Fetch round/commitment tx info */
async function getRoundMeta(indexerUrl, txid) {
  try {
    const data = await indexerFetch(indexerUrl, `/v1/indexer/commitmentTx/${txid}`);
    if (!data) return null;

    const parts = [];
    if (data.batchCount != null) parts.push(`${data.batchCount} batch${data.batchCount !== 1 ? 'es' : ''}`);
    if (data.createdAt) {
      const date = new Date(data.createdAt);
      if (!isNaN(date.getTime())) parts.push(date.toISOString().slice(0, 10));
    }
    return parts.length > 0 ? parts.join(' | ') : null;
  } catch {
    return null;
  }
}

function buildMetaHtml(title, description, url) {
  const t = esc(title);
  const d = esc(description);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body></body>
</html>`;
}

export async function onRequest(context) {
  const ua = context.request.headers.get('user-agent') || '';

  if (!BOT_UA.test(ua)) {
    return context.next();
  }

  const url = new URL(context.request.url);
  const path = url.pathname;
  const indexerUrl = context.env?.VITE_INDEXER_URL || DEFAULT_INDEXER;

  // Transaction page — no rich data available, use static text
  const txMatch = path.match(/^\/tx\/([0-9a-fA-F]+)$/);
  if (txMatch) {
    return new Response(
      buildMetaHtml(
        `Tx ${truncate(txMatch[1])} | Arkade Explorer`,
        `View Arkade transaction ${txMatch[1]}`,
        context.request.url
      ),
      { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
    );
  }

  // Round/commitment tx page
  const commitMatch = path.match(/^\/commitment-tx\/([0-9a-fA-F]+)$/);
  if (commitMatch) {
    const extra = await getRoundMeta(indexerUrl, commitMatch[1]);
    const desc = extra
      ? `Round ${truncate(commitMatch[1])} | ${extra}`
      : `View Arkade round transaction ${commitMatch[1]}`;
    return new Response(
      buildMetaHtml(`Round ${truncate(commitMatch[1])} | Arkade Explorer`, desc, context.request.url),
      { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
    );
  }

  // Address page
  const addrMatch = path.match(/^\/address\/(.+)$/);
  if (addrMatch) {
    const addr = decodeURIComponent(addrMatch[1]);
    const extra = await getAddressMeta(indexerUrl, addr);
    const desc = extra
      ? `${truncate(addr, 12, 8)} | ${extra}`
      : `View Arkade address ${addr}`;
    return new Response(
      buildMetaHtml(`Address ${truncate(addr, 12, 8)} | Arkade Explorer`, desc, context.request.url),
      { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
    );
  }

  // Asset page
  const assetMatch = path.match(/^\/asset\/([0-9a-fA-F]+)$/);
  if (assetMatch) {
    const meta = await getAssetMeta(indexerUrl, assetMatch[1]);
    const title = meta?.title || `Asset ${truncate(assetMatch[1])} | Arkade Explorer`;
    const desc = meta?.description || `View Arkade asset ${assetMatch[1]}`;
    return new Response(
      buildMetaHtml(title, desc, context.request.url),
      { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
    );
  }

  return context.next();
}
