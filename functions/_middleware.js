const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot|Slack-ImgProxy|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|yandex|Embedly|showyoubot|outbrain|pinterest|vkShare|W3C_Validator|Iframely/i;

function truncate(str, start = 8, end = 8) {
  if (!str || str.length <= start + end + 3) return str || '';
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function getPageMeta(url) {
  const path = new URL(url).pathname;

  // Transaction page
  const txMatch = path.match(/^\/tx\/([0-9a-fA-F]+)$/);
  if (txMatch) {
    const txid = txMatch[1];
    return {
      title: `Transaction ${truncate(txid)} | Arkade Explorer`,
      description: `View Arkade transaction ${txid}`,
    };
  }

  // Commitment/Round transaction page
  const commitMatch = path.match(/^\/commitment-tx\/([0-9a-fA-F]+)$/);
  if (commitMatch) {
    const txid = commitMatch[1];
    return {
      title: `Round ${truncate(txid)} | Arkade Explorer`,
      description: `View Arkade round transaction ${txid}`,
    };
  }

  // Address page
  const addrMatch = path.match(/^\/address\/(.+)$/);
  if (addrMatch) {
    const addr = decodeURIComponent(addrMatch[1]);
    return {
      title: `Address ${truncate(addr, 12, 8)} | Arkade Explorer`,
      description: `View Arkade address ${addr}`,
    };
  }

  // Asset page
  const assetMatch = path.match(/^\/asset\/([0-9a-fA-F]+)$/);
  if (assetMatch) {
    const assetId = assetMatch[1];
    return {
      title: `Asset ${truncate(assetId)} | Arkade Explorer`,
      description: `View Arkade asset ${assetId}`,
    };
  }

  return null;
}

function buildMetaHtml(meta, url) {
  const title = meta.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const desc = meta.description.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
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

  const meta = getPageMeta(context.request.url);

  if (!meta) {
    return context.next();
  }

  return new Response(buildMetaHtml(meta, context.request.url), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}
