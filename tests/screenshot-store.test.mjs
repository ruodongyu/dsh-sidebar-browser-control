import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScreenshotStore } from '../lib/screenshot-store.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]).toString('base64');
const temp = () => mkdtemp(join(tmpdir(), 'dsh-sidebar-store-test-'));

test('concurrent saves enforce count and always retain the most recent result', async () => {
  const directory = await temp();
  const store = await createScreenshotStore({ directory, maxCount: 2 });
  const paths = await Promise.all(Array.from({ length: 5 }, () => store.save(png)));
  assert.equal((await readdir(directory)).length, 2);
  assert.equal((await stat(paths.at(-1))).size, 12);
});

test('byte budget removes managed files but preserves unrelated files', async () => {
  const directory = await temp();
  await writeFile(join(directory, 'keep.txt'), 'keep');
  await writeFile(join(directory, 'sidebar-123.png'), 'legacy');
  const store = await createScreenshotStore({ directory, maxBytes: 24, maxImageBytes: 24 });
  await store.save(png); await store.save(png); const newest = await store.save(png);
  const files = await readdir(directory);
  assert.equal(files.filter(name => /sidebar-\d+-.*\.png/.test(name)).length, 2);
  assert.equal(await readFile(join(directory, 'keep.txt'), 'utf8'), 'keep');
  assert.equal(await readFile(join(directory, 'sidebar-123.png'), 'utf8'), 'legacy');
  await stat(newest);
});

test('startup pruning applies quotas to earlier managed screenshots', async () => {
  const directory = await temp();
  const first = await createScreenshotStore({ directory, maxCount: 5 });
  await first.save(png); await first.save(png); await first.save(png);
  await createScreenshotStore({ directory, maxCount: 1 });
  assert.equal((await readdir(directory)).length, 1);
});

test('invalid and oversized images fail without deleting existing screenshots', async () => {
  const directory = await temp();
  const store = await createScreenshotStore({ directory, maxBytes: 24, maxImageBytes: 24 });
  const existing = await store.save(png);
  await assert.rejects(store.save(Buffer.from('not png').toString('base64')), /PNG/);
  await assert.rejects(store.save(Buffer.concat([Buffer.from(png, 'base64'), Buffer.alloc(40)]).toString('base64')), /too large/);
  assert.equal((await stat(existing)).size, 12);
});
