// index.js — the entire proxy server
// Deploy this as a NEW standalone Vercel project (not inside aniwatch-api)
//
// FIX: Properly passes through JSON content-type for aniwatch API responses.
// FIX: Added detailed error logging to diagnose 500s.
// FIX: Removed allowlist restriction that was silently blocking aniwatch API domains.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    // Validate it's a real URL
    new URL(targetUrl);
  } catch (e) {
    res.status(400).json({ error: 'Invalid url: ' + e.message });
    return;
  }

  // Block SSRF — disallow internal/metadata addresses
  const hostname = new URL(targetUrl).hostname;
  const BLOCKED = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal'];
  if (BLOCKED.some(h => hostname === h || hostname.endsWith('.' + h))) {
    res.status(403).json({ error: 'Blocked host: ' + hostname });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'Referer':    'https://hianime.to/',
        'Origin':     'https://hianime.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':     '*/*',
        // Pass through range header for video segments
        ...(req.headers['range'] ? { 'Range': req.headers['range'] } : {}),
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      // Log the upstream error body so it shows in Vercel function logs
      let errBody = '';
      try { errBody = await upstream.text(); } catch (_) {}
      console.error('[proxy] upstream error', upstream.status, targetUrl.slice(0, 200), errBody.slice(0, 500));
      res.status(upstream.status).json({
        error: `Upstream ${upstream.status}`,
        url: targetUrl.slice(0, 200),
        body: errBody.slice(0, 300),
      });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // Pass through relevant upstream headers
    ['content-length', 'content-range', 'accept-ranges'].forEach(h => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=30');

    const buffer = await upstream.arrayBuffer();
    res.status(upstream.status || 200).send(Buffer.from(buffer));
  } catch (e) {
    console.error('[proxy] fetch threw:', e.message, targetUrl.slice(0, 200));
    res.status(502).json({ error: e.message, url: targetUrl.slice(0, 200) });
  }
}
