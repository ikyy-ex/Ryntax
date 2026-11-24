// Proxy CORS untuk tool "Get Code HTML". GET /.netlify/functions/proxy?url=https://...
const dns = require('dns').promises;
const net = require('net');
const { json } = require('../lib/util');

function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const x = ip.toLowerCase();
  return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:');
}

async function isSafe(u) {
  if (!/^https?:$/.test(u.protocol)) return false;
  if (u.port && !['80', '443'].includes(u.port)) return false;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const list = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  return list.length > 0 && list.every(i => !isPrivate(i.address));
}

exports.handler = async (event) => {
  let u;
  try { u = new URL((event.queryStringParameters || {}).url); } catch (e) { return json(400, { error: 'URL tidak valid' }); }
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!(await isSafe(u))) return json(403, { error: 'Alamat tidak diizinkan' });
      const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RyntaxFetcher/1.0)' } });
      const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc) { u = new URL(loc, u); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 2 * 1024 * 1024) return json(413, { error: 'Halaman terlalu besar (maksimal 2 MB)' });
      return { statusCode: r.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: buf.toString('utf-8') };
    }
    return json(508, { error: 'Terlalu banyak pengalihan (redirect)' });
  } catch (e) {
    return json(502, { error: 'Gagal mengambil halaman' });
  }
};
