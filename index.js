// index.js — the entire proxy server
// Deploy this as a NEW standalone Vercel project (not inside aniwatch-api)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }

  try {
    const upstream = await fetch(decodeURIComponent(url), {
      headers: {
        'Referer': 'https://hianimez.to/',
        'Origin': 'https://hianimez.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
      return;
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
