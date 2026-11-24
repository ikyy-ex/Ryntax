// Netlify Function: autentikasi Ryntax (register, login, sesi, profil, logout, hapus akun)
const crypto = require('crypto');
const {
  store, sign, session, hash, check, cookie, json, sameOrigin, rate, pub, TTL
} = require('./_lib');

const users = () => store('users');
const emailKey = email => 'email:' + email.toLowerCase();
const userKey = id => 'id:' + id;
const now = () => new Date().toISOString();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const clearCookie = () => cookie('', 0);

function ipOf(event) {
  return (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'unknown';
}
function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try { return JSON.parse(raw); } catch (_) { return null; }
}
function issueSession(user) {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  return sign({ id: user.id, name: user.name, email: user.email, exp });
}

exports.handler = async function (event) {
  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  if (method !== 'POST') return json(405, { error: 'Metode tidak diizinkan.' }, { Allow: 'POST, OPTIONS' });
  if (!sameOrigin(event)) return json(403, { error: 'Permintaan dari origin tidak diizinkan.' });

  const body = parseBody(event);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Format permintaan tidak valid.' });
  const action = String(body.action || '');
  const allowed = ['register', 'login', 'me', 'logout', 'profile', 'delete'];
  if (!allowed.includes(action)) return json(400, { error: 'Aksi autentikasi tidak dikenal.' });

  try {
    const ip = crypto.createHash('sha256').update(ipOf(event)).digest('hex').slice(0, 24);
    const limits = action === 'login' || action === 'register' ? 12 : 40;
    if (!(await rate('auth:' + action + ':' + ip, limits, 900))) return json(429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' });

    const db = users();

    if (action === 'register') {
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (name.length < 2 || name.length > 60) return json(400, { error: 'Nama harus 2–60 karakter.' });
      if (!validEmail(email) || email.length > 254) return json(400, { error: 'Masukkan email yang valid.' });
      if (password.length < 8 || password.length > 128) return json(400, { error: 'Password harus 8–128 karakter.' });
      if (await db.get(emailKey(email))) return json(409, { error: 'Email sudah terdaftar. Silakan login.' });
      const user = { id: crypto.randomUUID(), name, email, passwordHash: await hash(password), created: now(), updated: now() };
      await db.set(userKey(user.id), user);
      await db.set(emailKey(email), user.id);
      const token = issueSession(user);
      return json(201, { user: pub(user) }, { 'Set-Cookie': cookie(token, TTL) });
    }

    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!validEmail(email) || !password) return json(400, { error: 'Email dan password wajib diisi.' });
      const id = await db.get(emailKey(email));
      const user = id ? await db.get(userKey(id)) : null;
      if (!user || !user.passwordHash || !(await check(password, user.passwordHash))) return json(401, { error: 'Email atau password salah.' });
      return json(200, { user: pub(user) }, { 'Set-Cookie': cookie(issueSession(user), TTL) });
    }

    if (action === 'me') {
      const s = session(event);
      if (!s || !s.id) return json(401, { error: 'Belum login.' });
      const user = await db.get(userKey(s.id));
      if (!user) return json(401, { error: 'Sesi tidak berlaku. Silakan login kembali.' }, { 'Set-Cookie': clearCookie() });
      return json(200, { user: pub(user) });
    }

    if (action === 'logout') return json(200, { ok: true }, { 'Set-Cookie': clearCookie() });

    const s = session(event);
    if (!s || !s.id) return json(401, { error: 'Silakan login terlebih dahulu.' });
    const user = await db.get(userKey(s.id));
    if (!user) return json(401, { error: 'Akun tidak ditemukan. Silakan login kembali.' }, { 'Set-Cookie': clearCookie() });

    if (action === 'profile') {
      const name = String(body.name || '').trim();
      const oldPassword = String(body.password || '');
      const newPassword = String(body.newPassword || '');
      if (name.length < 2 || name.length > 60) return json(400, { error: 'Nama harus 2–60 karakter.' });
      if (newPassword) {
        if (!oldPassword || !(await check(oldPassword, user.passwordHash))) return json(401, { error: 'Password lama salah.' });
        if (newPassword.length < 8 || newPassword.length > 128) return json(400, { error: 'Password baru harus 8–128 karakter.' });
        user.passwordHash = await hash(newPassword);
      }
      user.name = name;
      user.updated = now();
      await db.set(userKey(user.id), user);
      return json(200, { user: pub(user) }, { 'Set-Cookie': cookie(issueSession(user), TTL) });
    }

    if (action === 'delete') {
      const password = String(body.password || '');
      if (!password || !(await check(password, user.passwordHash))) return json(401, { error: 'Password salah.' });
      await db.del(userKey(user.id));
      await db.del(emailKey(user.email));
      return json(200, { ok: true }, { 'Set-Cookie': clearCookie() });
    }

    return json(400, { error: 'Aksi tidak valid.' });
  } catch (error) {
    console.error('Ryntax auth error:', error && error.message);
    return json(500, { error: 'Terjadi kesalahan pada server autentikasi. Periksa AUTH_SECRET dan konfigurasi Netlify.' });
  }
};
