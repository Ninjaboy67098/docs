const { getAuthToken, COOKIE_NAME, LOGIN_HTML } = require('../lib/auth');

const DOCS_PASSWORD = (process.env.DOCS_PASSWORD || '').trim();

function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const data = Buffer.concat(chunks).toString('utf8');
        const params = new URLSearchParams(data);
        resolve({ password: (params.get('password') || '').trim() });
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Location', '/');
    res.status(302).end();
    return;
  }

  // Vercel may pre-parse body; Node stream otherwise
  let password = '';
  if (req.body && typeof req.body === 'object' && req.body.password != null) {
    password = String(req.body.password).trim();
  } else {
    const body = await parseBody(req);
    password = (body && body.password) || '';
  }

  if (password && password === DOCS_PASSWORD) {
    const token = getAuthToken();
    const isProd = process.env.VERCEL_ENV === 'production';
    const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookie);
    res.setHeader('Location', '/');
    res.status(302).end();
    return;
  }

  res.status(401).setHeader('Content-Type', 'text/html').send(
    LOGIN_HTML.replace('{{ERROR}}', '<div class="error">Incorrect password. Please try again.</div>')
  );
};
