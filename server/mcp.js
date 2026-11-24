import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';

const id = z.number().int().positive();
const page = id.default(1);
const date = z.iso.date();
const apiPath = z.string().regex(/^\/(?:[a-z]+\/)*(?:[a-z]+|\d+)\.json$/, 'Use a relative Tick endpoint such as /clients.json');

function createServer(credentials, fetchImpl) {
  const server = new McpServer({ name: 'tick', version: '1.0.0' });
  async function call(method, path, params = {}, body) {
    const url = new URL(`https://www.tickspot.com/${credentials.subscription}/api/v2${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: credentials.authorization,
        'User-Agent': `TickMCP (${credentials.email})`,
        'Content-Type': 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // Do not expose upstream response bodies, which may contain credentials.
    if (!response.ok) throw new Error(`Tick API returned HTTP ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : { ok: true };
  }
  async function fetchAll(path, params = {}, maxPages = 50) {
    const results = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = await call('GET', path, { ...params, page });
      if (!Array.isArray(batch) || batch.length === 0) return results;
      results.push(...batch);
    }
    throw new Error('Too many results; narrow the date range');
  }
  function tool(name, description, inputSchema, readOnly, handler) {
    server.registerTool(name, {
      description, inputSchema,
      annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, openWorldHint: true },
    }, async (args) => {
      try {
        return { content: [{ type: 'text', text: JSON.stringify(await handler(args)) }] };
      } catch (error) {
        const message = error.message.startsWith('Tick API returned HTTP ')
          ? error.message : 'Tick request failed. Check connectivity and Tick API parameters.';
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    });
  }
  tool('list_projects', 'List open Tick projects. Request successive pages until empty.', { page }, true,
    (args) => call('GET', '/projects.json', args));
  tool('list_tasks', 'List open tasks for a Tick project.', { project_id: id, page }, true,
    ({ project_id, page }) => call('GET', `/projects/${project_id}/tasks.json`, { page }));
  tool('list_entries', 'List time entries between inclusive YYYY-MM-DD dates. Results are paginated.', {
    start_date: date, end_date: date, user_id: id.optional(), project_id: id.optional(), page,
  }, true, (args) => {
    if (args.start_date > args.end_date) throw new Error('Invalid date range');
    return call('GET', '/entries.json', args);
  });
  tool('summarize_entries', 'Show everything logged between inclusive YYYY-MM-DD dates, e.g. "what did I do last week". Fetches all pages, defaults to the authenticated user (pass all_users for everyone), and returns each entry with task and project names plus totals by day and project.', {
    start_date: date, end_date: date, user_id: id.optional(), project_id: id.optional(),
    all_users: z.boolean().default(false),
  }, true, async ({ start_date, end_date, user_id, project_id, all_users }) => {
    if (start_date > end_date) throw new Error('Invalid date range');
    if (user_id === undefined && !all_users) {
      const me = (await fetchAll('/users.json')).find(user => user.email?.toLowerCase() === credentials.email.toLowerCase());
      if (!me) throw new Error('Could not find the authenticated Tick user');
      user_id = me.id;
    }
    const entries = await fetchAll('/entries.json', { start_date, end_date, user_id, project_id });
    const tasks = new Map();
    const projects = new Map();
    const lookup = (cache, path) => {
      if (!cache.has(path)) cache.set(path, call('GET', path).catch(() => null));
      return cache.get(path);
    };
    const items = await Promise.all(entries.map(async (entry) => {
      const task = entry.task_id ? await lookup(tasks, `/tasks/${entry.task_id}.json`) : null;
      const project = task?.project_id ? await lookup(projects, `/projects/${task.project_id}.json`) : null;
      return {
        id: entry.id, date: entry.date, hours: entry.hours, notes: entry.notes, user_id: entry.user_id,
        task_id: entry.task_id, task: task?.name ?? null, project_id: task?.project_id ?? null, project: project?.name ?? null,
      };
    }));
    items.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const round = (n) => Math.round(n * 100) / 100;
    const totals = (key) => Object.fromEntries(Object.entries(items.reduce((acc, item) => {
      const k = item[key] ?? 'Unknown';
      acc[k] = (acc[k] ?? 0) + item.hours;
      return acc;
    }, {})).map(([k, v]) => [k, round(v)]));
    return {
      start_date, end_date, user_id: user_id ?? null, entry_count: items.length,
      total_hours: round(items.reduce((sum, item) => sum + item.hours, 0)),
      hours_by_date: totals('date'), hours_by_project: totals('project'), entries: items,
    };
  });
  tool('create_entry', 'Log time against a Tick task.', {
    task_id: id, hours: z.number().positive(), date, notes: z.string().default(''),
  }, false, (args) => call('POST', '/entries.json', {}, args));
  tool('request', 'Call another Tick endpoint. PUT updates and DELETE permanently removes data. Paths are relative to the subscription API, e.g. /clients.json or /entries/235.json.', {
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']), path: apiPath,
    params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    body: z.record(z.string(), z.unknown()).optional(),
  }, false, ({ method, path, params, body }) => {
    if (method === 'GET' && body !== undefined) throw new Error('GET cannot have a body');
    return call(method, path, params, body);
  });
  return server;
}

export function mountMcp(app, { fetchImpl = fetch, oauth } = {}) {
  if (oauth) {
    const authenticate = requireBearerAuth({ verifier: oauth.provider, requiredScopes: ['tick'], resourceMetadataUrl: oauth.metadataUrl, expectedResource: oauth.resource });
    app.use('/mcp', (req, res, next) => {
      if (req.get('authorization')?.startsWith('Token token=')) return next();
      return authenticate(req, res, next);
    });
  }
  app.all('/mcp', async (req, res) => {
    // This endpoint is for native MCP clients; disallow browser-origin requests.
    if (req.headers.origin) return res.status(403).json({ error: 'Browser origins are not supported' });
    const credentials = req.auth?.extra?.credentials;
    const authorization = credentials?.authorization ?? req.get('authorization') ?? '';
    const subscription = credentials?.subscription ?? req.get('x-tick-subscription-id') ?? '';
    const email = credentials?.email ?? req.get('x-tick-email') ?? '';
    if (!/^Token token=\S+$/.test(authorization) || !/^\d+$/.test(subscription) || !/^[^\s@<>]+@[^\s@<>]+$/.test(email)) {
      return res.status(401).json({ error: 'Provide Authorization: Token token=..., X-Tick-Subscription-Id, and X-Tick-Email headers' });
    }
    if (req.method !== 'POST') return res.status(405).set('Allow', 'POST').end();
    const server = createServer({ authorization, subscription, email }, fetchImpl);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'MCP request failed' } });
    }
  });
}
