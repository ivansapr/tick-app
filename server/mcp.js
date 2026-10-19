import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

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

export function mountMcp(app, { fetchImpl = fetch } = {}) {
  app.all('/mcp', async (req, res) => {
    // This endpoint is for native MCP clients; disallow browser-origin requests.
    if (req.headers.origin) return res.status(403).json({ error: 'Browser origins are not supported' });
    const authorization = req.get('authorization') ?? '';
    const subscription = req.get('x-tick-subscription-id') ?? '';
    const email = req.get('x-tick-email') ?? '';
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
