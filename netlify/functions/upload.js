// Foto ke Link dan File ke Link. POST multipart, field "file" -> {"url":"..."}.
// Opsional: env GOFILE_TOKEN (token akun GoFile) agar file masuk ke akun Anda.
const { json, sameOrigin, readForm } = require('../lib/util');
const MAX = 4 * 1024 * 1024; // batas body Netlify Functions ~6 MB (base64)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Gunakan POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Asal permintaan tidak diizinkan' });
  try {
    const file = (await readForm(event)).get('file');
    if (!file || typeof file === 'string') return json(400, { error: 'Field "file" tidak ditemukan' });
    if (file.size > MAX) return json(413, { error: 'Ukuran file maksimal 4 MB' });
    const fd = new FormData();
    fd.append('file', file, file.name || 'file');
    const headers = process.env.GOFILE_TOKEN ? { Authorization: 'Bearer ' + process.env.GOFILE_TOKEN } : {};
    const r = await fetch('https://upload.gofile.io/uploadfile', { method: 'POST', headers: headers, body: fd });
    const d = await r.json();
    if (d.status !== 'ok' || !d.data || !d.data.downloadPage) return json(502, { error: 'GoFile menolak upload' });
    return json(200, { url: d.data.downloadPage });
  } catch (e) {
    return json(500, { error: 'Upload gagal' });
  }
};
