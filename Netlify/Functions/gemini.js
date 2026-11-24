const { json, cors, guard } = require('./_lib');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Gunakan POST.' });
  if (!guard(event)) return json(429, { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(503, { error: 'GEMINI_API_KEY belum diatur di server.' });
  let msgs;
  try { msgs = JSON.parse(event.body || '{}').messages; } catch { return json(400, { error: 'JSON tidak valid.' }); }
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > 40) return json(400, { error: 'Format messages tidak valid.' });
  const contents = msgs.map(m => ({ role: /^(assistant|ai|model)$/.test(m.role) ? 'model' : 'user', parts: [{ text: String(m.content ?? m.text ?? '').slice(0, 8000) }] }));
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents }), signal: AbortSignal.timeout(25000)
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json(r.status === 429 ? 429 : 502, { error: r.status === 429 ? 'Batas penggunaan API tercapai.' : (r.status === 400 || r.status === 403) ? 'API key salah, model tidak tersedia, atau tidak punya akses.' : 'Layanan Gemini gagal (' + r.status + ').' });
    const reply = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    if (!reply) return json(502, { error: 'Respons Gemini kosong atau diblokir.' });
    return json(200, { reply });
  } catch { return json(504, { error: 'Gemini tidak merespons (timeout).' }); }
};
