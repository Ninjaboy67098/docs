require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const DOCS_PASSWORD = process.env.DOCS_PASSWORD;
const COOKIE_NAME = 'docs_auth';
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'docs-session-secret-change-in-production';
const AUTH_PORT = parseInt(process.env.AUTH_PORT || '3000', 10);
const DOCS_TARGET = process.env.DOCS_TARGET || 'http://localhost:3001';

if (!DOCS_PASSWORD) {
  console.error('Missing DOCS_PASSWORD in .env. Add DOCS_PASSWORD=your_password to .env');
  process.exit(1);
}

function getAuthToken() {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(DOCS_PASSWORD).digest('hex');
}

function isAuthenticated(req) {
  const token = req.cookies?.[COOKIE_NAME];
  return token && token === getAuthToken();
}

const loginPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation – Sign in</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0e1c32 0%, #1a2d4a 50%, #0e1c32 100%);
      color: #e2e8f0;
    }
    .card {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(71, 85, 105, 0.5);
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    p {
      margin: 0 0 1.5rem 0;
      color: #94a3b8;
      font-size: 0.9rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #cbd5e1;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 1px solid #475569;
      border-radius: 8px;
      background: #1e293b;
      color: #f1f5f9;
      margin-bottom: 1.25rem;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #007EA7;
      box-shadow: 0 0 0 3px rgba(0, 126, 167, 0.2);
    }
    button {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      background: #007EA7;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    button:hover { background: #00668a; }
    .error {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      color: #fca5a5;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Documentation</h1>
    <p>Enter the password to view the docs.</p>
    {{ERROR}}
    <form method="post" action="/login">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" required autofocus>
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>
`;

app.get('/login', (req, res) => {
  res.redirect('/');
});

app.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (password === DOCS_PASSWORD) {
    res.cookie(COOKIE_NAME, getAuthToken(), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
    });
    return res.redirect('/');
  }
  const errorHtml = '<div class="error">Incorrect password. Please try again.</div>';
  res.status(401).send(loginPage.replace('{{ERROR}}', errorHtml));
});

app.get('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.redirect('/');
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path === '/login' || req.path === '/logout') return next();
  if (!isAuthenticated(req)) {
    return res.send(loginPage.replace('{{ERROR}}', ''));
  }
  next();
});

app.use(
  createProxyMiddleware({
    target: DOCS_TARGET,
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).send(
        '<p>Documentation server is not running. Start it with: <code>mint dev</code></p>'
      );
    },
  })
);

app.listen(AUTH_PORT, () => {
  console.log(`Auth gateway running at http://localhost:${AUTH_PORT}`);
  console.log(`Start the docs on port 3001: mint dev --port 3001`);
});
