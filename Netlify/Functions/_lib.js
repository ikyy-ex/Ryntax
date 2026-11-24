// Pustaka bersama: penyimpanan permanen (Netlify Blobs), hash password, sesi bertanda tangan.
const crypto = require('crypto');
const COOKIE = 'rx_session', TTL = 60 * 60 * 24 * 30;
let mem = null; // hanya untuk uji lokal (RYNTAX_TEST=1)
function store(name) {
  if (process.env.RYNTAX_TEST) { mem = mem || {}; const m = (mem[name] = mem[name] || {}); return { get: async k => (k in m ? JSON.parse(m[k]) : null), set: async (k, v) => { m[k] = JSON.stringify(v); }, del: async k => { delete m[k]; } }; }
  const { getStore } = require('@netlify/blobs'); const s = getStore({ name, consistency: 'strong' });
  return { get: k => s.get(k, { type: 'json' }), set: (k, v) => s.setJSON(k, v), del: k => s.delete(k) };
}
const secret = () => { const s = process.env.AUTH_SECRET; if (!s || s.length < 32) throw new Error('AUTH_SECRET belum diatur (minimal 32 karakter).'); return s; };
const b64 = b => Buffer.from(b).toString('base64url');
const sign = p => { const body = b64(JSON.stringify(p)); return body + '.' + crypto.createHmac('sha256', secret()).update(body).digest('base64url'); };
function verify(t) {
  if (!t || t.indexOf('.') < 0) return null; const [body, sig] = t.split('.'); const good = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() / 1000 ? p : null; } catch (e) { return null; }
}
const hash = (pw, salt) => new Promise((ok, no) => { salt = salt || crypto.randomBytes(16).toString('hex'); crypto.scrypt(pw, salt, 64, { N: 16384 }, (e, k) => e ? no(e) : ok(salt + ':' + k.toString('hex'))); });
async function check(pw, stored) { const [salt, h] = stored.split(':'); const re = (await hash(pw, salt)).split(':')[1]; return crypto.timingSafeEqual(Buffer.from(re), Buffer.from(h)); }
const cookie = (v, age) => COOKIE + '=' + v + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + age;
const json = (code, obj, extra) => ({ statusCode: code, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, extra || {}), body: JSON.stringify(obj) });
function session(event) { const m = /(?:^|;\s*)rx_session=([^;]+)/.exec(event.headers.cookie || event.headers.Cookie || ''); return m ? verify(m[1]) : null; }
function sameOrigin(event) { const o = event.headers.origin; if (!o) return true; const h = event.headers.host; try { return new URL(o).host === h; } catch (e) { return false; } }
async function rate(key, max, windowSec) { const s = store('ratelimit'), now = Math.floor(Date.now() / 1000); const r = (await s.get(key)) || { n: 0, t: now }; if (now - r.t > windowSec) { r.n = 0; r.t = now; } r.n++; await s.set(key, r); return r.n <= max; }
const pub = u => ({ id: u.id, name: u.name, email: u.email, created: u.created });
module.exports = { store, sign, verify, hash, check, cookie, json, session, sameOrigin, rate, pub, TTL };

