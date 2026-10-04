import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBridge } from '../lib/bridge.js';

async function setup(t, timeoutMs = 300) {
  const bridge = await startBridge({ port: 0, saveControl: false, timeoutMs });
  t.after(() => bridge.close());
  const base = `http://127.0.0.1:${bridge.port}`;
  const { token } = bridge.rendererConnection();
  const headers = { Origin: 'dsh-app://app', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  return { bridge, base, headers };
}

test('reject foreign origins, missing token and local control without authorization', async t => {
  const { base } = await setup(t);
  for (const [path, options] of [
    ['/connect', { method: 'POST', headers: { Origin: 'https://evil.example' } }],
    ['/next', { headers: { Origin: 'dsh-app://app' } }],
    ['/call', { method: 'POST', body: '{}' }]
  ]) assert.equal((await fetch(base + path, options)).status, 403);
  assert.equal((await fetch(base + '/connect', { method: 'POST', headers: { Origin: 'dsh-app://app' } })).status, 403);
});

test('deliver only requested operation and return its result', async t => {
  const { bridge, base, headers } = await setup(t);
  const result = bridge.request('read', { tabId: 'page-1' });
  const [command] = await (await fetch(base + '/next', { headers })).json();
  assert.equal(command.operation, 'read');
  assert.deepEqual(command.args, { tabId: 'page-1' });
  await fetch(base + '/result', { method: 'POST', headers, body: JSON.stringify({ id: command.id, value: { text: 'test' } }) });
  assert.deepEqual(await result, { text: 'test' });
});

test('cancel removes queued operations and timeout rejects', async t => {
  const { bridge, base } = await setup(t, 25);
  const controller = new AbortController();
  const cancelled = bridge.request('click', {}, controller.signal);
  controller.abort(new Error('cancelled'));
  await assert.rejects(cancelled, /cancelled/);
  await assert.rejects(bridge.request('read'), /超时/);
  assert.equal((await (await fetch(base + '/status')).json()).pending, 0);
});

test('local demonstration page is available', async t => {
  const { base } = await setup(t);
  const response = await fetch(base + '/test');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /SIDEBAR_BROWSER_TEST_20261004/);
});

test('several instances get distinct OS-assigned ports by default', async t => {
  const first = await startBridge({ saveControl: false });
  const second = await startBridge({ saveControl: false });
  t.after(() => first.close()); t.after(() => second.close());
  assert.ok(first.port > 0); assert.ok(second.port > 0);
  assert.notEqual(first.port, second.port);
});
