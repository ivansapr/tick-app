import express from 'express';
import { randomBytes } from 'node:crypto';
import { createClientsStore } from './clients-store.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { InvalidGrantError, InvalidTokenError, InvalidTargetError, InvalidScopeError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

const nonce = () => randomBytes(32).toString('hex');
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const now = () => Date.now();
const MINUTE = 60_000;
function store() {
  const map = new Map();
  return {
    get(key) { const v = map.get(key); if (v?.expires <= now()) { map.delete(key); return undefined; } return v; },
    set(key, value, ttl) {
      for (const [k, v] of map) if (v.expires <= now()) map.delete(k);
      if (map.size >= 10_000) throw new Error('Authorization capacity reached');
      map.set(key, { ...value, expires: now() + ttl });
    },
    delete(key) { map.delete(key); },
  };
}

export function mountOAuth(app, { publicUrl, fetchImpl = fetch, clientsFile = process.env.MCP_CLIENTS_FILE }) {
  const issuer = new URL(publicUrl);
  if (issuer.pathname !== '/' || issuer.search || issuer.hash || issuer.username || issuer.password) throw new Error('MCP_PUBLIC_URL must be an origin URL');
  const resource = new URL('/mcp', issuer);
  const clients = createClientsStore(clientsFile);
  const pending = store(), codes = store(), access = store(), refresh = store(), attempts = store();
  function checkResource(value) {
    if (value && String(value) !== resource.href) throw new InvalidTargetError('Invalid MCP resource');
  }
  function grant(clientId, credentials) {
    const token = nonce(), refreshToken = nonce();
    access.set(token, { clientId, credentials }, 60 * MINUTE);
    refresh.set(refreshToken, { clientId, credentials }, 7 * 24 * 60 * MINUTE);
    return { access_token: token, token_type: 'Bearer', expires_in: 3600, refresh_token: refreshToken, scope: 'tick' };
  }
  function getCode(client, code) {
    const record = codes.get(code);
    if (!record || record.clientId !== client.client_id) throw new InvalidGrantError('Invalid or expired authorization code');
    return record;
  }
  const provider = {
    clientsStore: {
      getClient(id) { return clients.getClient(id); },
      registerClient(client) {
        // Only explicit HTTPS or native loopback callbacks; never wildcard redirects.
        if (!client.redirect_uris.every(value => {
          const url = new URL(value);
          return !url.hash && !url.username && !url.password && (url.protocol === 'https:' ||
            (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
        })) throw new InvalidGrantError('Use HTTPS or loopback redirect URIs');
        return clients.registerClient(client);
      },
    },
    async authorize(client, params, res) {
      checkResource(params.resource);
      if (params.scopes?.some(s => s !== 'tick')) throw new InvalidScopeError('Unknown scope');
      const flow = nonce();
      pending.set(flow, { clientId: client.client_id, clientName: client.client_name || 'MCP client', params }, 10 * MINUTE);
      res.cookie('tick_mcp_flow', flow, { httpOnly: true, secure: issuer.protocol === 'https:', sameSite: 'strict', path: '/oauth', maxAge: 10 * MINUTE });
      res.redirect(`/oauth/login?flow=${flow}`);
    },
    async challengeForAuthorizationCode(client, code) { return getCode(client, code).params.codeChallenge; },
    async exchangeAuthorizationCode(client, code, _verifier, redirectUri, target) {
      const record = getCode(client, code);
      checkResource(target);
      if (redirectUri !== record.params.redirectUri) throw new InvalidGrantError('Redirect URI mismatch');
      codes.delete(code);
      return grant(client.client_id, record.credentials);
    },
    async exchangeRefreshToken(client, token, scopes, target) {
      checkResource(target);
      const record = refresh.get(token);
      if (!record || record.clientId !== client.client_id) throw new InvalidGrantError('Invalid refresh token');
      if (scopes?.some(s => s !== 'tick')) throw new InvalidScopeError('Unknown scope');
      refresh.delete(token);
      return grant(client.client_id, record.credentials);
    },
    async verifyAccessToken(token) {
      const record = access.get(token);
      if (!record) throw new InvalidTokenError('Invalid or expired access token');
      return { token, clientId: record.clientId, scopes: ['tick'], expiresAt: Math.floor(record.expires / 1000), resource, extra: { credentials: record.credentials } };
    },
    async revokeToken(client, { token }) {
      for (const storage of [access, refresh]) if (storage.get(token)?.clientId === client.client_id) storage.delete(token);
    },
  };
  app.use(mcpAuthRouter({ provider, issuerUrl: issuer, resourceServerUrl: resource, scopesSupported: ['tick'], resourceName: 'Tick Time Tracker' }));
  app.use('/oauth', express.urlencoded({ extended: false, limit: '8kb' }), (req, res, next) => {
    // no-referrer makes browser form POSTs send Origin: null, failing CSRF checks.
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  function getFlow(req) {
    const flow = req.method === 'GET' ? req.query.flow : req.body.flow;
    const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('tick_mcp_flow='))?.slice(14);
    const record = typeof flow === 'string' && cookie === flow ? pending.get(flow) : undefined;
    return { flow, record };
  }
  function page(res, content) {
    res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Connect Tick</title><style>body{font:16px system-ui;background:#f5f6fa;color:#202636;margin:60px auto;padding:24px;max-width:440px}form{display:grid;gap:18px;background:white;padding:28px;border-radius:12px}input,select,button{font:inherit;padding:12px;width:100%;box-sizing:border-box}label{display:grid;gap:8px}button{cursor:pointer;background:#5666d8;color:white;border:0;border-radius:6px}</style></head><body><h1>Connect Tick</h1>${content}</body></html>`);
  }
  app.get('/oauth/login', (req, res) => {
    const { flow, record } = getFlow(req);
    if (!record) return res.status(400).send('Authorization expired. Reconnect from Claude.');
    page(res, `<p>Sign in to connect <strong>${escape(record.clientName)}</strong> to Tick.</p><form method="post" action="/oauth/login"><input type="hidden" name="flow" value="${flow}"><label>Email<input type="email" name="email" autocomplete="username" required></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label><button>Sign in</button><p>Your password is used only to sign in to Tick.</p></form>`);
  });
  app.post('/oauth/login', async (req, res) => {
    const { flow, record } = getFlow(req);
    if (!record || record.roles) return res.status(400).send('Authorization expired. Reconnect from Claude.');
    if (req.headers.origin && req.headers.origin !== issuer.origin) return res.status(403).send('Sign-in origin rejected. Reopen sign-in from Claude. The server MCP_PUBLIC_URL must match this site\'s HTTPS origin.');
    const key = req.ip;
    const attempt = attempts.get(key) || { count: 0 };
    if (attempt.count >= 10) return res.status(429).send('Too many sign-in attempts. Try again in 15 minutes.');
    attempts.set(key, { count: attempt.count + 1 }, 15 * MINUTE);
    const { email, password } = req.body;
    if (typeof email !== 'string' || !/^[^\s@<>]+@[^\s@<>]+$/.test(email) || typeof password !== 'string' || !password) return res.status(400).send('Enter your Tick email and password.');
    try {
      const response = await fetchImpl('https://www.tickspot.com/api/v2/roles.json', {
        headers: { Authorization: `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`, 'User-Agent': `TickMCP (${email})` },
        redirect: 'error', signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error('Sign-in failed');
      const roles = await response.json();
      if (!Array.isArray(roles) || !roles.length || roles.some(r => !/^\d+$/.test(String(r.subscription_id)) || typeof r.api_token !== 'string' || !/^\S+$/.test(r.api_token))) throw new Error('No subscriptions');
      pending.set(flow, { ...record, email, roles }, 10 * MINUTE);
      page(res, `<p>Allow <strong>${escape(record.clientName)}</strong> to read and change Tick data, including creating and deleting entries?</p><form method="post" action="/oauth/approve"><input type="hidden" name="flow" value="${flow}"><label>Subscription<select name="subscription">${roles.map(r => `<option value="${escape(r.subscription_id)}">${escape(r.company || r.subscription?.name || r.subscription_id)}</option>`).join('')}</select></label><button name="decision" value="allow">Allow access</button><button name="decision" value="deny">Cancel</button></form>`);
    } catch {
      res.status(401).send('Could not sign in to Tick. Go back to try again, or restart the connection from Claude.');
    }
  });
  app.post('/oauth/approve', (req, res) => {
    const { flow, record } = getFlow(req);
    if (!record?.roles) return res.status(400).send('Authorization expired. Reconnect from Claude.');
    if (req.headers.origin && req.headers.origin !== issuer.origin) return res.status(403).send('Authorization origin rejected. Reopen sign-in from Claude. The server MCP_PUBLIC_URL must match this site\'s HTTPS origin.');
    const role = record.roles.find(r => String(r.subscription_id) === req.body.subscription);
    if (!role) return res.sendStatus(400);
    pending.delete(flow);
    res.clearCookie('tick_mcp_flow', { path: '/oauth' });
    const redirect = new URL(record.params.redirectUri);
    if (record.params.state !== undefined) redirect.searchParams.set('state', record.params.state);
    if (req.body.decision !== 'allow') redirect.searchParams.set('error', 'access_denied');
    else {
      const code = nonce();
      codes.set(code, { clientId: record.clientId, params: record.params, credentials: { email: record.email, subscription: String(role.subscription_id), authorization: `Token token=${role.api_token}` } }, MINUTE);
      redirect.searchParams.set('code', code);
    }
    res.redirect(redirect.href);
  });
  return { provider, resource, metadataUrl: new URL('/.well-known/oauth-protected-resource/mcp', issuer).href };
}
