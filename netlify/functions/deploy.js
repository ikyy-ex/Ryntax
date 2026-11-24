// Ryntax Deploy: buat situs Netlify baru dari ZIP. POST multipart, field "file" (ZIP berisi index.html) -> {"url":"..."}.
// Wajib: env NETLIFY_TOKEN (Personal access token) dan ALLOW_PUBLIC_DEPLOY=yes.
// Peringatan: siapa pun yang membuka situs Anda bisa membuat situs di akun Netlify Anda selama ini aktif.
const { json, sameOrigin, readForm } = require('../lib/util');
const MAX = 4 * 1024 * 1024;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Gunakan POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Asal permintaan tidak diizinkan' });
  if (process.env.ALLOW_PUBLIC_DEPLOY !== 'yes') return json(403, { error: 'Deploy publik dinonaktifkan. Setel ALLOW_PUBLIC_DEPLOY=yes di Netlify jika ingin mengaktifkan.' });
  if (!process.env.NETLIFY_TOKEN) return json(500, { error: 'NETLIFY_TOKEN belum diatur' });
  try {
    const file = (await readForm(event)).get('file');
    if (!file || typeof file === 'string') return json(400, { error: 'Field "file" tidak ditemukan' });
    if (!/\.zip$/i.test(file.name || '')) return json(400, { error: 'Bungkus index.html dalam file ZIP' });
    if (file.size > MAX) return json(413, { error: 'Ukuran ZIP maksimal 4 MB' });
    const r = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.NETLIFY_TOKEN, 'Content-Type': 'application/zip' },
      body: Buffer.from(await file.arrayBuffer())
    });
    const d = await r.json();
    if (!r.ok) return json(502, { error: 'Netlify menolak deploy' });
    return json(200, { url: d.ssl_url || d.url });
  } catch (e) {
    return json(500, { error: 'Deploy gagal' });
  }
};
