const crypto = require('crypto');

const COOKIE_NAME = 'docs_auth';

function getAuthToken() {
  const secret = (process.env.COOKIE_SECRET || 'docs-session-secret-change-in-production').trim();
  const password = (process.env.DOCS_PASSWORD || '').trim();
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

function parseCookie(header) {
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [key, ...v] = part.trim().split('=');
    if (key) acc[key] = v.join('=').trim();
    return acc;
  }, {});
}

function isAuthenticated(cookieHeader) {
  const cookies = parseCookie(cookieHeader);
  const token = cookies[COOKIE_NAME];
  return token && token === getAuthToken();
}

const LOGIN_HTML = `<!DOCTYPE html>
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
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600; }
    p { margin: 0 0 1.5rem 0; color: #94a3b8; font-size: 0.9rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; }
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
    <form method="post" action="/api/login">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" required autofocus>
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`;

module.exports = {
  COOKIE_NAME,
  getAuthToken,
  parseCookie,
  isAuthenticated,
  LOGIN_HTML,
};
