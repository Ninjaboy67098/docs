const { getAuthToken, COOKIE_NAME, LOGIN_HTML } = require('../lib/auth');

const DOCS_PASSWORD = process.env.DOCS_PASSWORD;

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(data);
        resolve({ password: params.get('password') || '' });
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Location', '/');
    res.status(302).end();
    return;
  }

  const body = await parseBody(req);
  const password = (body && body.password) || '';

  if (password === DOCS_PASSWORD) {
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
