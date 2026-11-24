const { json, cors, guard } = require('./_lib');
// Frontend mengirim multipart dengan field "image_file"; diteruskan apa adanya ke remove.bg.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Gunakan POST.' });
  if (!guard(event, 10)) return json(429, { error: 'Terlalu banyak permintaan.' });
  const key = process.env.REMOVEBG_API_KEY;
  if (!key) return json(503, { error: 'REMOVEBG_API_KEY belum diatur di server.' });
  const buf = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
  if (!buf.length || buf.length > 4.5 * 1024 * 1024) return json(413, { error: 'Gambar kosong atau lebih dari 4,5 MB.' });
  try {
    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST', headers: { 'X-Api-Key': key, 'Content-Type': event.headers['content-type'] }, body: buf, signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) return json(r.status === 402 ? 402 : r.status === 403 ? 403 : 502, { error: r.status === 402 ? 'Kredit remove.bg habis.' : r.status === 403 ? 'API key remove.bg salah.' : 'remove.bg gagal (' + r.status + ').' });
    return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'image/png' }, body: Buffer.from(await r.arrayBuffer()).toString('base64'), isBase64Encoded: true };
  } catch { return json(504, { error: 'remove.bg tidak merespons (timeout).' }); }
};
