// index.js — deploy this as the ONLY file in your anime-proxy-2 GitHub repo
// (along with vercel.json)
// Handles requests like: https://anime-proxy-2.vercel.app/?url=https://...

export default async function handler(req, res) {
  // Always allow CORS from any origin (including null/file://)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const target = req.query.url;
  if (!target) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'Referer': 'https://hianimez.to/',
        'Origin': 'https://hianimez.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.status(upstream.status).send(Buffer.from(body));
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed', detail: e.message });
  }
}
