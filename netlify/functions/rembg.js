// Remove Background via remove.bg. POST multipart, field "image" -> gambar PNG.
// Wajib: env REMOVEBG_KEY.
const { json, sameOrigin, readForm } = require('../lib/util');
const MAX = 3 * 1024 * 1024;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Gunakan POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Asal permintaan tidak diizinkan' });
  if (!process.env.REMOVEBG_KEY) return json(500, { error: 'REMOVEBG_KEY belum diatur di Netlify' });
  try {
    const img = (await readForm(event)).get('image');
    if (!img || typeof img === 'string') return json(400, { error: 'Field "image" tidak ditemukan' });
    if (img.size > MAX) return json(413, { error: 'Ukuran gambar maksimal 3 MB' });
    const fd = new FormData();
    fd.append('image_file', img, img.name || 'image.png');
    fd.append('size', 'auto');
    const r = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': process.env.REMOVEBG_KEY }, body: fd });
    if (!r.ok) return json(502, { error: 'remove.bg menolak permintaan (kuota habis atau gambar tidak valid)' });
    const buf = Buffer.from(await r.arrayBuffer());
    return { statusCode: 200, headers: { 'Content-Type': 'image/png' }, body: buf.toString('base64'), isBase64Encoded: true };
  } catch (e) {
    return json(500, { error: 'Pemrosesan gagal' });
  }
};
