// PhotoDrop — send photos from your phone to Meta Ray-Ban Display glasses.
// Zero dependencies: just Node 18+. Photos live in memory (last MAX_PHOTOS only).

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
// Secret shared by your phone and glasses. Set PHOTODROP_KEY on your host.
const KEY = process.env.PHOTODROP_KEY || 'change-me';
const MAX_PHOTOS = 10;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB per upload

/** @type {{id:string, ts:number, type:string, data:Buffer}[]} */
let photos = [];

const PUBLIC = path.join(__dirname, 'public');

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function serveFile(res, file) {
  fs.readFile(path.join(PUBLIC, file), (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    const type = file.endsWith('.html') ? 'text/html; charset=utf-8'
      : file.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    send(res, 200, data, type);
  });
}

function authorized(url) {
  const k = url.searchParams.get('key') || '';
  const a = Buffer.from(k);
  const b = Buffer.from(KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // Pages (the pages themselves are public; the API needs the key)
  if (req.method === 'GET' && (p === '/' || p === '/send')) return serveFile(res, 'send.html');
  if (req.method === 'GET' && p === '/glasses') return serveFile(res, 'glasses.html');
  if (req.method === 'GET' && p === '/icon-96.png') return serveFile(res, 'icon-96.png');
  if (req.method === 'GET' && p === '/health') return send(res, 200, { ok: true });

  if (!p.startsWith('/api/')) return send(res, 404, { error: 'not found' });
  if (!authorized(url)) return send(res, 401, { error: 'bad key' });

  // List photos (newest last)
  if (req.method === 'GET' && p === '/api/photos') {
    return send(res, 200, photos.map(({ id, ts }) => ({ id, ts })));
  }

  // Get one photo
  const m = p.match(/^\/api\/photo\/([a-f0-9]+)$/);
  if (req.method === 'GET' && m) {
    const ph = photos.find((x) => x.id === m[1]);
    if (!ph) return send(res, 404, { error: 'gone' });
    res.writeHead(200, { 'Content-Type': ph.type, 'Cache-Control': 'private, max-age=86400' });
    return res.end(ph.data);
  }

  // Upload a photo (raw body, already resized by the phone page)
  if (req.method === 'POST' && p === '/api/photo') {
    const type = req.headers['content-type'] || '';
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return send(res, 415, { error: 'send jpeg/png/webp' });
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) { send(res, 413, { error: 'too big' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      const id = crypto.randomBytes(6).toString('hex');
      photos.push({ id, ts: Date.now(), type, data: Buffer.concat(chunks) });
      if (photos.length > MAX_PHOTOS) photos = photos.slice(-MAX_PHOTOS);
      send(res, 201, { id });
    });
    return;
  }

  // Clear everything
  if (req.method === 'DELETE' && p === '/api/photos') {
    photos = [];
    return send(res, 200, { ok: true });
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`PhotoDrop on :${PORT}`);
  if (KEY === 'change-me') console.warn('WARNING: set PHOTODROP_KEY to something secret.');
});
