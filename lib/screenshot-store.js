import { mkdir, readdir, stat, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const MANAGED_NAME = /^sidebar-\d+-[0-9a-f-]{36}\.png$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Only this store's regular PNG files may be removed; unrelated files and links are preserved. */
export async function createScreenshotStore({ directory, maxCount = 20, maxBytes = 50 * 1024 * 1024, maxImageBytes = 8 * 1024 * 1024 }) {
  for (const value of [maxCount, maxBytes, maxImageBytes]) if (!Number.isSafeInteger(value) || value < 1) throw new Error('Screenshot limits must be positive integers');
  await mkdir(directory, { recursive: true });
  let serial = Promise.resolve();
  const enqueue = action => {
    const result = serial.then(action);
    serial = result.catch(() => {});
    return result;
  };
  async function prune(keepPath) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !MANAGED_NAME.test(entry.name)) continue;
      const path = join(directory, entry.name);
      const info = await stat(path);
      files.push({ path, size: info.size, time: info.mtimeMs });
    }
    files.sort((a, b) => a.time - b.time || a.path.localeCompare(b.path));
    const newestIndex = files.findIndex(file => file.path === keepPath);
    if (newestIndex >= 0) files.push(...files.splice(newestIndex, 1));
    let bytes = files.reduce((sum, file) => sum + file.size, 0);
    while (files.length > maxCount || bytes > maxBytes) {
      const file = files.shift();
      await unlink(file.path);
      bytes -= file.size;
    }
  }
  await enqueue(prune);
  return {
    save(base64) {
      return enqueue(async () => {
        if (typeof base64 !== 'string' || base64.length > Math.ceil(maxImageBytes / 3) * 4) throw new Error('Screenshot is too large');
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Screenshot must be a PNG');
        if (buffer.length > Math.min(maxImageBytes, maxBytes)) throw new Error('Screenshot exceeds the storage limit');
        const path = join(directory, `sidebar-${Date.now()}-${randomUUID()}.png`);
        await writeFile(path, buffer, { flag: 'wx', mode: 0o600 });
        await prune(path);
        return path;
      });
    },
    prune: () => enqueue(prune)
  };
}
