// index.js — deploy this as the ONLY file in your anime-proxy-2 GitHub repo
// (along with vercel.json)
// Handles requests like: https://anime-proxy-2.vercel.app/?url=<encoded-url>

export default async function handler(req, res) {
  // Explicitly allow null origin (file:// pages send Origin: null)
  const origin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }

  let targetUrl;
  try { targetUrl = decodeURIComponent(url); }
  catch(e) { res.status(400).json({ error: 'Bad url encoding' }); return; }

  console.log('Proxying:', targetUrl.slice(0, 100));

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Referer':         'https://hianimez.to/',
        'Origin':          'https://hianimez.to',
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    const buf = await upstream.arrayBuffer();

    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.status(upstream.status).send(Buffer.from(buf));

  } catch(e) {
    console.error('Proxy error:', e.message);
    res.status(502).json({ error: e.message });
  }
}
