const { getAuthToken, isAuthenticated, COOKIE_NAME, LOGIN_HTML } = require('../lib/auth');

const DOCS_PASSWORD = (process.env.DOCS_PASSWORD || '').trim();
const MINTLIFY_ORIGIN = (process.env.MINTLIFY_ORIGIN || '').replace(/\/$/, '');

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Small HTML that sets cookie and redirects (avoids 302 cookie issues in some browsers)
function redirectWithCookie(token, res) {
  const isProd = process.env.VERCEL_ENV === 'production';
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(
    '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/"></head><body>Signing you in...</body></html>'
  );
}

module.exports = async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = (url.searchParams.get('path') || '').trim();
  const cookieHeader = req.headers.cookie;

  // Handle login POST (form posts to / or /api/login; both end up here with path in query)
  const isLoginPost = req.method === 'POST' && (path === 'api/login' || path === '');
  if (isLoginPost) {
    let bodyStr = '';
    try {
      bodyStr = await getRawBody(req);
    } catch (_) {}
    const params = new URLSearchParams(bodyStr || '');
    const password = (params.get('password') || '').trim();

    if (password && password === DOCS_PASSWORD) {
      redirectWithCookie(getAuthToken(), res);
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(401).send(
      LOGIN_HTML.replace('{{ERROR}}', '<div class="error">Incorrect password. Please try again.</div>')
    );
    return;
  }

  // Proxy logic
  if (!MINTLIFY_ORIGIN) {
    res.status(500).setHeader('Content-Type', 'text/plain').end('MINTLIFY_ORIGIN is not set.');
    return;
  }

  const authed = isAuthenticated(cookieHeader);
  const isLoginPath = path === '' || path === 'login';

  if (!authed) {
    if (req.method === 'GET' && isLoginPath) {
      res.setHeader('Content-Type', 'text/html').status(200).send(LOGIN_HTML.replace('{{ERROR}}', ''));
      return;
    }
    res.setHeader('Location', '/');
    res.status(302).end();
    return;
  }

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
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try { body = await getRawBody(req); } catch (_) {}
    }
    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body || undefined,
      redirect: 'manual',
    });

    res.status(proxyRes.status);
    proxyRes.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'set-cookie') return;
      if (k === 'location') {
        const loc = proxyRes.headers.get('location');
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
      '<p>Could not reach the documentation. Check MINTLIFY_ORIGIN (e.g. https://estizee.mintlify.app).</p>'
    );
  }
};
