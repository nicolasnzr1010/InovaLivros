// Internal Storage adapter. Publish only through the portal-authenticated Nginx.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ROOT = process.env.STORAGE_ROOT || '/data/capas';
const MAX_FILE = 10 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 1024 * 1024;
fs.mkdirSync(ROOT, { recursive: true });

function reply(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(typeof message === 'string' ? { statusCode: String(status), error: message, message } : message));
}

function imageType(data) {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (data.length > 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function extractFile(body, contentType) {
  if (!/^multipart\/form-data/i.test(contentType)) return body;
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const value = boundary && (boundary[1] || boundary[2]);
  if (!value || value.length > 200) throw new Error('Invalid multipart boundary');
  const marker = Buffer.from('--' + value);
  let cursor = body.indexOf(marker);
  while (cursor !== -1) {
    const start = cursor + marker.length;
    if (body.toString('ascii', start, start + 2) === '--') break;
    const headerEnd = body.indexOf('\r\n\r\n', start);
    const next = body.indexOf(Buffer.concat([Buffer.from('\r\n'), marker]), start);
    if (headerEnd === -1 || next === -1 || headerEnd > next) break;
    const headers = body.toString('utf8', start, headerEnd);
    if (/content-disposition:[^\r\n]*filename=/i.test(headers)) return body.subarray(headerEnd + 4, next);
    cursor = next + 2;
  }
  throw new Error('Image file missing');
}

const server = http.createServer(async (req, res) => {
  req.setTimeout(30000);
  const pathname = new URL(req.url, 'http://storage').pathname;
  if (req.method === 'GET' && pathname === '/health') return reply(res, 200, { status: 'ok' });
  const upload = /^\/storage\/v1\/object\/capas\/([A-Za-z0-9_-]+\.(?:png|jpe?g|webp))$/i.exec(pathname);
  const download = /^\/storage\/v1\/object\/public\/capas\/([A-Za-z0-9_-]+\.(?:png|jpe?g|webp))$/i.exec(pathname);
  if ((req.method === 'GET' || req.method === 'HEAD') && download) {
    const filename = path.join(ROOT, download[1]);
    let stat;
    try { stat = fs.statSync(filename); } catch { return reply(res, 404, 'Image not found'); }
    const ext = path.extname(filename).toLowerCase();
    res.writeHead(200, {
      'Content-Type': ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      'Content-Length': stat.size,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(filename);
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    return stream.pipe(res);
  }
  if (req.method !== 'POST' || !upload) return reply(res, 404, 'Storage route not found');
  if (Number(req.headers['content-length']) > MAX_BODY) {
    req.resume();
    return reply(res, 413, 'Image exceeds 10 MB');
  }
  let size = 0;
  const chunks = [];
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) {
        reply(res, 413, 'Image exceeds 10 MB');
        req.destroy();
        return;
      }
      chunks.push(chunk);
    }
    const data = extractFile(Buffer.concat(chunks), req.headers['content-type'] || '');
    if (data.length > MAX_FILE) return reply(res, 413, 'Image exceeds 10 MB');
    const type = imageType(data);
    const ext = path.extname(upload[1]).toLowerCase();
    const expected = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    if (!type || type !== expected) return reply(res, 415, 'Use a PNG, JPG or WEBP image with the correct extension');
    fs.writeFileSync(path.join(ROOT, upload[1]), data, { flag: 'wx', mode: 0o644 });
    return reply(res, 200, { Key: 'capas/' + upload[1], Id: randomUUID() });
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    if (error.code === 'EEXIST') return reply(res, 409, 'Image already exists');
    if (error.code) {
      console.error('Storage write failed:', error.code);
      return reply(res, 500, 'Unable to save image');
    }
    return reply(res, 400, 'Invalid upload');
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
