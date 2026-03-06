import { ArkAddress } from '@arkade-os/sdk';
import { hex } from '@scure/base';
import { ImageResponse } from 'workers-og';

const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot|Slack-ImgProxy|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|yandex|Embedly|showyoubot|outbrain|pinterest|vkShare|W3C_Validator|Iframely/i;

const DEFAULT_INDEXER = 'https://indexer.arkadeos.com';
const BRAND_ORANGE = '#F14317';

// Arkade logo as inline SVG path data (extracted from logo-orange.svg)
const LOGO_SVG = `<svg width="200" height="60" viewBox="130 55 430 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M141.66 84.1179L160.253 65.5254H197.438L216.03 84.1179V102.71H197.438V84.1179H160.253V102.71H141.66L141.66 84.1179Z" fill="#F14317"/>
<path d="M160.253 121.303V102.71H197.438V121.303H160.253Z" fill="#F14317"/>
<path d="M160.253 121.303H141.66V139.896H160.253V121.303Z" fill="#F14317"/>
<path d="M197.438 121.303V139.896H216.03V121.303H197.438Z" fill="#F14317"/>
<path d="M523.483 134.217C520.089 134.217 516.899 133.603 513.915 132.374C510.989 131.145 508.444 129.477 506.278 127.371C504.113 125.206 502.416 122.689 501.187 119.822C499.959 116.896 499.344 113.794 499.344 110.517C499.344 107.24 499.959 104.168 501.187 101.301C502.416 98.375 504.113 95.8587 506.278 93.7521C508.444 91.5869 510.989 89.8899 513.915 88.661C516.899 87.4321 520.089 86.8177 523.483 86.8177C526.994 86.8177 530.183 87.4321 533.05 88.661C535.976 89.8899 538.493 91.5869 540.599 93.7521C542.706 95.9172 544.315 98.4335 545.427 101.301C546.597 104.168 547.183 107.24 547.183 110.517V113.151H512.072C512.306 114.555 512.745 115.901 513.388 117.189C514.091 118.476 514.939 119.617 515.934 120.612C516.987 121.548 518.158 122.309 519.445 122.894C520.732 123.421 522.078 123.684 523.483 123.684C525.472 123.684 527.082 123.421 528.311 122.894C529.598 122.309 530.651 121.694 531.47 121.051C532.348 120.29 533.05 119.412 533.577 118.417H546.744C545.807 121.343 544.344 123.977 542.355 126.317C541.477 127.312 540.453 128.278 539.283 129.214C538.112 130.15 536.766 130.999 535.245 131.76C533.723 132.52 531.968 133.105 529.978 133.515C528.047 133.983 525.882 134.217 523.483 134.217ZM534.016 105.69C533.782 104.578 533.372 103.525 532.787 102.53C532.202 101.535 531.441 100.657 530.505 99.8964C529.627 99.1357 528.574 98.5213 527.345 98.0531C526.175 97.585 524.887 97.3509 523.483 97.3509C520.615 97.3509 518.216 98.1994 516.285 99.8964C514.412 101.535 513.154 103.466 512.511 105.69H534.016Z" fill="#F14317"/>
<path d="M466.428 134.217C463.56 134.217 460.868 133.661 458.352 132.55C455.894 131.438 453.729 129.858 451.857 127.81C449.984 125.761 448.492 123.274 447.38 120.349C446.327 117.423 445.8 114.146 445.8 110.517C445.8 106.889 446.327 103.612 447.38 100.686C448.492 97.7605 449.984 95.2735 451.857 93.2254C453.729 91.1773 455.894 89.5973 458.352 88.4854C460.868 87.3736 463.56 86.8177 466.428 86.8177C468.885 86.8177 470.963 87.198 472.66 87.9588C474.415 88.661 475.878 89.451 477.049 90.3287C478.395 91.3821 479.536 92.5524 480.472 93.8398H480.911V71.4567H493.2V132.901H480.911V127.195H480.472C479.536 128.483 478.395 129.653 477.049 130.706C475.878 131.584 474.415 132.374 472.66 133.076C470.963 133.837 468.885 134.217 466.428 134.217ZM469.5 123.684C472.835 123.684 475.556 122.543 477.663 120.261C479.828 117.979 480.911 114.731 480.911 110.517C480.911 106.304 479.828 103.056 477.663 100.774C475.556 98.492 472.835 97.3509 469.5 97.3509C466.398 97.3509 463.794 98.492 461.688 100.774C459.581 103.056 458.528 106.304 458.528 110.517C458.528 114.731 459.581 117.979 461.688 120.261C463.794 122.543 466.398 123.684 469.5 123.684Z" fill="#F14317"/>
<path d="M412.445 134.217C409.577 134.217 406.885 133.661 404.369 132.55C401.911 131.438 399.746 129.858 397.874 127.81C396.001 125.761 394.509 123.274 393.397 120.349C392.344 117.423 391.817 114.146 391.817 110.517C391.817 106.889 392.344 103.612 393.397 100.686C394.509 97.7605 396.001 95.2735 397.874 93.2254C399.746 91.1773 401.911 89.5973 404.369 88.4854C406.885 87.3736 409.577 86.8177 412.445 86.8177C414.902 86.8177 416.98 87.198 418.677 87.9588C420.432 88.661 421.895 89.451 423.066 90.3287C424.412 91.3821 425.553 92.5524 426.489 93.8398H426.928V88.1343H439.217V132.901H426.928V127.195H426.489C425.553 128.483 424.412 129.653 423.066 130.706C421.895 131.584 420.432 132.374 418.677 133.076C416.98 133.837 414.902 134.217 412.445 134.217ZM415.517 123.684C418.852 123.684 421.574 122.543 423.68 120.261C425.845 117.979 426.928 114.731 426.928 110.517C426.928 106.304 425.845 103.056 423.68 100.774C421.574 98.492 418.852 97.3509 415.517 97.3509C412.415 97.3509 409.811 98.492 407.705 100.774C405.598 103.056 404.545 106.304 404.545 110.517C404.545 114.731 405.598 117.979 407.705 120.261C409.811 122.543 412.415 123.684 415.517 123.684Z" fill="#F14317"/>
<path d="M348.858 71.4567H361.147V104.812H366.413L378.263 88.1343H391.869L377.385 108.762L393.185 132.901H379.141L367.73 115.345H361.147V132.901H348.858V71.4567Z" fill="#F14317"/>
<path d="M314.162 88.1343H326.451V94.7176H326.889C327.416 93.3132 328.206 92.0843 329.259 91.031C330.137 90.0947 331.308 89.2462 332.771 88.4854C334.233 87.6662 336.077 87.2565 338.3 87.2565H343.567V99.1065H336.984C333.648 99.1065 331.044 100.013 329.172 101.828C327.358 103.642 326.451 106.099 326.451 109.201V132.901H314.162V88.1343Z" fill="#F14317"/>
<path d="M265.857 71.4567H293.507L309.745 132.901H296.14L292.629 119.295H266.735L263.224 132.901H249.618L265.857 71.4567ZM289.557 107.006L283.412 83.7455H275.951L269.807 107.006H289.557Z" fill="#F14317"/>
</svg>`;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function truncate(str, start = 8, end = 8) {
  if (!str || str.length <= start + end + 3) return str || '';
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function formatSats(satsBigInt) {
  const str = satsBigInt.toString();
  const padded = str.padStart(9, '0');
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

function addressToScriptHex(address) {
  if (/^[0-9a-fA-F]+$/.test(address) && address.length % 2 === 0) {
    return address.toLowerCase();
  }
  const decoded = ArkAddress.decode(address);
  return hex.encode(decoded.pkScript);
}

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

// ---------------------------------------------------------------------------
// Page matching — returns { type, title, description, stats[] } or null
// ---------------------------------------------------------------------------

async function getPageMeta(pagePath, indexerUrl) {
  // Transaction
  const txMatch = pagePath.match(/^\/tx\/([0-9a-fA-F]+)$/);
  if (txMatch) {
    return {
      type: 'tx',
      label: 'Transaction',
      id: txMatch[1],
      title: `Tx ${truncate(txMatch[1])} | Arkade Explorer`,
      description: `View Arkade transaction ${txMatch[1]}`,
      stats: [],
    };
  }

  // Round / commitment tx
  const commitMatch = pagePath.match(/^\/commitment-tx\/([0-9a-fA-F]+)$/);
  if (commitMatch) {
    const data = await indexerFetch(indexerUrl, `/v1/indexer/commitmentTx/${commitMatch[1]}`);
    const stats = [];
    if (data?.batchCount != null) stats.push({ label: 'Batches', value: String(data.batchCount) });
    if (data?.createdAt) {
      const d = new Date(data.createdAt);
      if (!isNaN(d.getTime())) stats.push({ label: 'Date', value: d.toISOString().slice(0, 10) });
    }
    const extra = stats.map(s => `${s.label}: ${s.value}`).join(' | ');
    return {
      type: 'round',
      label: 'Round',
      id: commitMatch[1],
      title: `Round ${truncate(commitMatch[1])} | Arkade Explorer`,
      description: extra ? `Round ${truncate(commitMatch[1])} | ${extra}` : `View Arkade round transaction ${commitMatch[1]}`,
      stats,
    };
  }

  // Address
  const addrMatch = pagePath.match(/^\/address\/(.+)$/);
  if (addrMatch) {
    const addr = decodeURIComponent(addrMatch[1]);
    const stats = [];
    try {
      const scriptHex = addressToScriptHex(addr);
      const data = await indexerFetch(indexerUrl, `/v1/indexer/vtxos?scripts=${scriptHex}`);
      if (data?.vtxos) {
        let totalSats = 0n;
        let activeCount = 0;
        const assetIds = new Set();
        for (const v of data.vtxos) {
          const isSpent = (v.spentBy && v.spentBy !== '') || v.isSpent;
          if (!isSpent) {
            totalSats += BigInt(v.amount || 0);
            activeCount++;
          }
          if (v.assets) {
            for (const a of v.assets) {
              if (a.assetId) assetIds.add(a.assetId);
            }
          }
        }
        stats.push({ label: 'Balance', value: formatSats(totalSats) });
        stats.push({ label: 'Active VTXOs', value: String(activeCount) });
        if (assetIds.size > 0) stats.push({ label: 'Assets', value: String(assetIds.size) });
      }
    } catch { /* graceful fallback */ }
    const extra = stats.map(s => `${s.value}`).join(' | ');
    return {
      type: 'address',
      label: 'Address',
      id: addr,
      title: `Address ${truncate(addr, 12, 8)} | Arkade Explorer`,
      description: extra ? `${truncate(addr, 12, 8)} | ${extra}` : `View Arkade address ${addr}`,
      stats,
    };
  }

  // Asset
  const assetMatch = pagePath.match(/^\/asset\/([0-9a-fA-F]+)$/);
  if (assetMatch) {
    const data = await indexerFetch(indexerUrl, `/v1/indexer/asset/${encodeURIComponent(assetMatch[1])}`);
    const stats = [];
    let assetLabel = truncate(assetMatch[1]);
    if (data) {
      const ticker = data.metadata?.ticker;
      const name = data.metadata?.name;
      const decimals = data.metadata?.decimals || 0;
      assetLabel = ticker || name || assetLabel;
      if (name) stats.push({ label: 'Name', value: name });
      if (ticker && name) stats.push({ label: 'Ticker', value: ticker });
      if (data.supply != null) stats.push({ label: 'Supply', value: formatAmount(data.supply, decimals) });
    }
    const extra = stats.map(s => `${s.value}`).join(' | ');
    return {
      type: 'asset',
      label: assetLabel,
      id: assetMatch[1],
      title: `${assetLabel} | Arkade Explorer`,
      description: extra || `View Arkade asset ${assetMatch[1]}`,
      stats,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// OG Image generation (1200x630 PNG)
// ---------------------------------------------------------------------------

function buildOgImageHtml(meta) {
  const statsHtml = meta.stats.length > 0
    ? meta.stats.map(s =>
        `<div style="display:flex;flex-direction:column;align-items:center;padding:0 28px;">
          <div style="font-size:36px;font-weight:bold;color:white;">${esc(s.value)}</div>
          <div style="font-size:18px;color:#9ca3af;text-transform:uppercase;margin-top:4px;">${esc(s.label)}</div>
        </div>`
      ).join('')
    : `<div style="font-size:28px;color:#9ca3af;">Arkade Protocol Explorer</div>`;

  const displayId = meta.type === 'address'
    ? truncate(meta.id, 16, 12)
    : meta.type === 'asset'
    ? ''
    : truncate(meta.id);

  const typeLabel = meta.type === 'asset' ? '' : meta.label;

  return `<div style="display:flex;flex-direction:column;width:1200px;height:630px;background:#0f0b1a;padding:60px;">
    <div style="display:flex;align-items:center;margin-bottom:40px;">
      ${LOGO_SVG}
    </div>
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;align-items:baseline;margin-bottom:24px;">
        ${typeLabel ? `<div style="font-size:22px;color:${BRAND_ORANGE};text-transform:uppercase;font-weight:bold;margin-right:16px;">${esc(typeLabel)}</div>` : ''}
        ${meta.type === 'asset'
          ? `<div style="font-size:48px;font-weight:bold;color:${BRAND_ORANGE};">${esc(meta.label)}</div>`
          : displayId ? `<div style="font-size:28px;color:#d1d5db;font-family:monospace;">${esc(displayId)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:16px;">
        ${statsHtml}
      </div>
    </div>
    <div style="display:flex;align-items:center;border-top:2px solid #2d2640;padding-top:20px;margin-top:auto;">
      <div style="font-size:18px;color:#6b7280;">arkade.sh</div>
    </div>
  </div>`;
}

async function handleOgImage(pagePath, indexerUrl) {
  const meta = await getPageMeta(pagePath, indexerUrl);
  if (!meta) return null;

  const html = buildOgImageHtml(meta);
  return new ImageResponse(html, {
    width: 1200,
    height: 630,
  });
}

// ---------------------------------------------------------------------------
// Meta HTML for bots
// ---------------------------------------------------------------------------

function buildMetaHtml(title, description, pageUrl, ogImageUrl) {
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
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body></body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const indexerUrl = context.env?.VITE_INDEXER_URL || DEFAULT_INDEXER;
  const origin = url.origin;

  // Handle OG image requests: /og-image/address/... /og-image/tx/... etc.
  if (path.startsWith('/og-image/')) {
    const pagePath = path.replace(/^\/og-image/, '');
    try {
      const response = await handleOgImage(pagePath, indexerUrl);
      if (response) return response;
    } catch {
      // Fall through to 404
    }
    return new Response('Not found', { status: 404 });
  }

  // Bot detection for meta HTML
  const ua = context.request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) {
    return context.next();
  }

  const meta = await getPageMeta(path, indexerUrl);
  if (!meta) return context.next();

  const ogImageUrl = `${origin}/og-image${path}`;
  return new Response(
    buildMetaHtml(meta.title, meta.description, context.request.url, ogImageUrl),
    { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
  );
}
