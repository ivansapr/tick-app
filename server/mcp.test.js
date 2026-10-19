import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mountMcp } from './mcp.js';

test('Claude-compatible HTTP lifecycle, tools, isolation, validation and upstream errors', async (t) => {
  const requests = [];
  let status = 200;
  const app = express();
  app.use(express.json());
  mountMcp(app, { fetchImpl: async (url, options) => {
    requests.push({ url: String(url), ...options });
    return new Response(status === 204 ? null : JSON.stringify(status === 200 ? [{ id: 1 }] : { secret: 'never expose' }), { status });
  } });
  const listener = app.listen(0, '127.0.0.1');
  await new Promise(resolve => listener.once('listening', resolve));
  t.after(() => new Promise(resolve => listener.close(resolve)));
  const url = new URL(`http://127.0.0.1:${listener.address().port}/mcp`);
  const headers = { Authorization: 'Token token=test-token', 'X-Tick-Subscription-Id': '123', 'X-Tick-Email': 'test@example.com' };
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(url, { headers })).status, 405);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }));
  t.after(() => client.close());
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(tool => tool.name), ['list_projects', 'list_tasks', 'list_entries', 'create_entry', 'request']);
  assert.equal(tools.tools[0].annotations.readOnlyHint, true);
  await client.callTool({ name: 'list_projects', arguments: { page: 2 } });
  assert.equal(requests.at(-1).url, 'https://www.tickspot.com/123/api/v2/projects.json?page=2');
  assert.equal(requests.at(-1).headers.Authorization, headers.Authorization);
  assert.equal(requests.at(-1).headers['User-Agent'], 'TickMCP (test@example.com)');
  await client.callTool({ name: 'list_entries', arguments: { start_date: '2026-10-01', end_date: '2026-10-19', user_id: 5 } });
  assert.match(requests.at(-1).url, /user_id=5/);
  await client.callTool({ name: 'create_entry', arguments: { task_id: 4, hours: 1.5, date: '2026-10-19' } });
  assert.deepEqual(JSON.parse(requests.at(-1).body), { task_id: 4, hours: 1.5, date: '2026-10-19', notes: '' });
  const count = requests.length;
  for (const path of ['https://evil.example/x.json', '/../roles.json', '//evil.json', '/%2e%2e/roles.json']) {
    const result = await client.callTool({ name: 'request', arguments: { method: 'GET', path } });
    assert.equal(result.isError, true);
  }
  assert.equal(requests.length, count);
  status = 204;
  const deleted = await client.callTool({ name: 'request', arguments: { method: 'DELETE', path: '/entries/235.json' } });
  assert.deepEqual(JSON.parse(deleted.content[0].text), { ok: true });
  status = 401;
  const failure = await client.callTool({ name: 'list_projects', arguments: {} });
  assert.equal(failure.isError, true);
  assert.match(failure.content[0].text, /HTTP 401/);
  assert.doesNotMatch(JSON.stringify(failure), /never expose|test-token/);
});
