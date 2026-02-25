// api/index.js
import https from 'https';
import http from 'http';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'Missing ?url= parameter' });

  let targetUrl;
  try { targetUrl = new URL(target); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const lib = targetUrl.protocol === 'https:' ? https : http;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: 'GET',
    headers: {
      'Referer': 'https://hianimez.to/',
      'Origin': 'https://hianimez.to',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  };

  return new Promise((resolve) => {
    const proxyReq = lib.request(options, (upstream) => {
      // Follow redirects
      if ([301,302,303,307,308].includes(upstream.statusCode) && upstream.headers.location) {
        const newUrl = new URL(upstream.headers.location, target);
        req.query.url = newUrl.toString();
        resolve(handler(req, res));
        return;
      }

      res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/octet-stream');
      res.status(upstream.statusCode);

      const chunks = [];
      upstream.on('data', chunk => chunks.push(chunk));
      upstream.on('end', () => {
        res.send(Buffer.concat(chunks));
        resolve();
      });
    });

    proxyReq.on('error', (e) => {
      res.status(502).json({ error: 'Upstream fetch failed', detail: e.message });
      resolve();
    });

    proxyReq.setTimeout(15000, () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Upstream timeout' });
      resolve();
    });

    proxyReq.end();
  });
}
