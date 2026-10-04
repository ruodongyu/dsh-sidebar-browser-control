import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ALLOWED_ORIGIN = 'dsh-app://app';
export async function startBridge({ port = 0, outputDir, timeoutMs = 20000, saveControl = true, listTools, executeTool, saveScreenshot }) {
  const rendererToken = randomBytes(32).toString('hex');
  const controlToken = randomBytes(32).toString('hex');
  const waiting = new Map();
  let poll, connectedAt = 0;
  const queue = [];
  function reply(res, code, data) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }
  async function body(req) {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 8 * 1024 * 1024) throw new Error('Response too large'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  }
  function deliver() {
    if (poll && queue.length) { const target = poll; poll = undefined; clearTimeout(target.timer); reply(target.res, 200, queue.splice(0)); }
  }
  function request(operation, args = {}, signal) {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (Date.now() - connectedAt > 30000) return Promise.reject(new Error('DSH 侧边栏控制客户端尚未连接；请刷新 DSH 界面。'));
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const finish = (error, result) => {
        if (!waiting.has(id)) return;
        clearTimeout(timer); signal?.removeEventListener('abort', abort); waiting.delete(id);
        const index = queue.findIndex(item => item.id === id); if (index >= 0) queue.splice(index, 1);
        error ? reject(error) : resolve(result);
      };
      const timer = setTimeout(() => finish(new Error('侧边栏操作超时；请确认浏览器页面仍打开。')), timeoutMs);
      const abort = () => finish(signal.reason || new Error('Cancelled'));
      waiting.set(id, finish); signal?.addEventListener('abort', abort, { once: true });
      queue.push({ id, operation, args, expiresAt: Date.now() + timeoutMs }); deliver();
    });
  }
  const server = createServer(async (req, res) => {
    try {
      const host = req.headers.host;
      if (host !== `127.0.0.1:${server.address().port}`) return reply(res, 403, { error: 'Invalid Host' });
      const path = new URL(req.url, 'http://127.0.0.1').pathname;
      const origin = req.headers.origin;
      if (origin !== undefined && origin !== ALLOWED_ORIGIN) return reply(res, 403, { error: 'Only DSH desktop may connect' });
      if (path === '/test' && req.method === 'GET') {
        const html = await readFile(new URL('../test-page.html', import.meta.url));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(html);
      }
      if (path === '/status' && req.method === 'GET') return reply(res, 200, { connected: Date.now() - connectedAt < 30000, pending: waiting.size });
      if (origin !== undefined) {
        if (origin !== ALLOWED_ORIGIN) return reply(res, 403, { error: 'Only DSH desktop may connect' });
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      }
      const auth = req.headers.authorization;
      if (path === '/tools' && req.method === 'GET') {
        if (origin !== undefined || auth !== `Bearer ${controlToken}`) return reply(res, 403, { error: 'Local verification authorization required' });
        return reply(res, 200, { tools: listTools?.() || [] });
      }
      if (path === '/call' && req.method === 'POST') {
        if (origin !== undefined || auth !== `Bearer ${controlToken}`) return reply(res, 403, { error: 'Local verification authorization required' });
        const call = await body(req);
        if (!['list', 'open', 'read', 'screenshot', 'navigate', 'back', 'forward', 'reload', 'click', 'fill', 'scroll'].includes(call.operation)) return reply(res, 400, { error: 'Unknown operation' });
        const value = executeTool ? await executeTool(call.operation, call.args || {}) : await request(call.operation, call.args);
        if (value.png) {
          if (!saveScreenshot) throw new Error('Screenshot storage is unavailable');
          value.path = await saveScreenshot(value.png); delete value.png;
        }
        return reply(res, 200, value);
      }
      if (origin !== ALLOWED_ORIGIN || auth !== `Bearer ${rendererToken}`) return reply(res, 403, { error: 'Renderer authorization required' });
      connectedAt = Date.now();
      if (path === '/next' && req.method === 'GET') {
        if (poll) { clearTimeout(poll.timer); reply(poll.res, 200, []); }
        poll = { res, timer: setTimeout(() => { if (poll?.res === res) poll = undefined; reply(res, 200, []); }, 15000) };
        res.on('close', () => { if (poll?.res === res) { clearTimeout(poll.timer); poll = undefined; } }); deliver(); return;
      }
      if (path === '/result' && req.method === 'POST') {
        const result = await body(req);
        waiting.get(result.id)?.(result.error ? new Error(result.error) : null, result.value);
        return reply(res, 200, { ok: true });
      }
      reply(res, 404, { error: 'Unknown route' });
    } catch (error) { if (!res.headersSent) reply(res, 500, { error: error.message }); else res.destroy(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  if (saveControl) { await mkdir(outputDir, { recursive: true }); await writeFile(join(outputDir, 'control.json'), JSON.stringify({ port: server.address().port, token: controlToken }), { mode: 0o600 }); }
  return {
    port: server.address().port,
    rendererConnection() { connectedAt = Date.now(); return { port: server.address().port, token: rendererToken }; },
    request,
    async close() { if (poll) { clearTimeout(poll.timer); reply(poll.res, 200, []); poll = undefined; } for (const finish of [...waiting.values()]) finish(new Error('Plugin stopped')); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  };
}
