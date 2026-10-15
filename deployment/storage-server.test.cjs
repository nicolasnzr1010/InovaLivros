const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Storage accepts SDK multipart, persists exact bytes and rejects invalid writes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inovalivros-storage-'));
  const child = spawn(process.execPath, [path.join(__dirname, 'storage-server.cjs')], {
    env: { ...process.env, PORT: '18764', STORAGE_ROOT: root }, stdio: 'pipe',
  });
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch('http://127.0.0.1:18764/health')).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const base = 'http://127.0.0.1:18764/storage/v1/object/';
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', new Blob([png], { type: 'image/png' }), 'test.png');
    const response = await fetch(base + 'capas/test.png', { method: 'POST', body: form });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).Key, 'capas/test.png');
    assert.deepEqual(fs.readFileSync(path.join(root, 'test.png')), png);
    const read = await fetch(base + 'public/capas/test.png');
    assert.equal(read.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await read.arrayBuffer()), png);
    assert.equal((await fetch(base + 'capas/test.png', { method: 'POST', body: png })).status, 409);
    assert.equal((await fetch(base + 'capas/bad.jpg', { method: 'POST', body: '<script>bad</script>' })).status, 415);
    assert.equal((await fetch(base + 'capas/mismatch.jpg', { method: 'POST', body: png })).status, 415);
    assert.equal((await fetch(base + 'capas/subdir/test.png', { method: 'POST', body: png })).status, 404);
    assert.equal((await fetch(base + 'public/capas/missing.png')).status, 404);
    assert.equal((await fetch(base + 'capas/huge.png', { method: 'POST', body: Buffer.alloc(12 * 1024 * 1024) })).status, 413);
  } finally {
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
