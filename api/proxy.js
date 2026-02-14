const { isAuthenticated, LOGIN_HTML } = require('../lib/auth');

const MINTLIFY_ORIGIN = (process.env.MINTLIFY_ORIGIN || '').replace(/\/$/, '');
const COOKIE_NAME = 'docs_auth';

module.exports = async (req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const path = (url.searchParams.get('path') || '').trim(); // from rewrite ?path=...
  const cookieHeader = req.headers.cookie;

  if (!MINTLIFY_ORIGIN) {
    res.status(500).setHeader('Content-Type', 'text/plain').end('MINTLIFY_ORIGIN is not set. Add it in Vercel Environment Variables.');
    return;
  }

  const authed = isAuthenticated(cookieHeader);
  const isLoginPath = path === '' || path === 'login' || path === 'api/login';

  if (!authed) {
    if (req.method === 'GET' && isLoginPath) {
      res.setHeader('Content-Type', 'text/html').status(200).send(LOGIN_HTML.replace('{{ERROR}}', ''));
      return;
    }
    res.setHeader('Location', '/');
    res.status(302).end();
    return;
  }

  // Optional: allow logout
  if (path === 'logout' && req.method === 'GET') {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
    res.setHeader('Location', '/');
    res.status(302).end();
    return;
  }

  const targetPath = path ? `/${path}` : '/';
  const qs = new URLSearchParams();
  url.searchParams.forEach((v, k) => { if (k !== 'path') qs.set(k, v); });
  const query = qs.toString();
  const targetUrl = `${MINTLIFY_ORIGIN}${targetPath}${query ? '?' + query : ''}`;

  const headers = {};
  const skip = ['host', 'connection', 'cookie'];
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase();
    if (skip.includes(key)) continue;
    if (v) headers[k] = Array.isArray(v) ? v[0] : v;
  }
  headers['Origin'] = new URL(MINTLIFY_ORIGIN).origin;
  headers['X-Forwarded-For'] = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  headers['X-Forwarded-Proto'] = req.headers['x-forwarded-proto'] || 'https';

  try {
    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await getRequestBody(req) : undefined,
      redirect: 'manual',
    });

    res.status(proxyRes.status);
    proxyRes.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'set-cookie') return;
      if (k === 'location') {
        const loc = proxyRes.headers.get('location');
        if (loc && loc.startsWith('/')) {
          res.setHeader('Location', loc);
          return;
        }
        if (loc) res.setHeader('Location', loc);
        return;
      }
      res.setHeader(key, value);
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.body) {
      res.setHeader('Content-Type', contentType);
      const buf = await proxyRes.arrayBuffer();
      res.end(Buffer.from(buf));
    } else {
      res.end();
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).setHeader('Content-Type', 'text/html').send(
      '<p>Could not reach the documentation. Check that MINTLIFY_ORIGIN is correct (e.g. https://estizee.mintlify.app).</p>'
    );
  }
};

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
