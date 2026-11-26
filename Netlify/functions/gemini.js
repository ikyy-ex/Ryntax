// Proxy AI: kunci GEMINI_API_KEY hanya ada di environment server, tidak pernah dikirim ke browser.
const L = require('./_lib');
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
exports.handler = async event => {
  try {
    if (event.httpMethod !== 'POST') return L.json(405, { error: 'Metode tidak diizinkan.' });
    if (!L.sameOrigin(event)) return L.json(403, { error: 'Origin tidak diizinkan.' });
    const s = L.session(event); if (!s) return L.json(401, { error: 'Silakan login untuk memakai fitur AI.' });
    const key = process.env.GEMINI_API_KEY; if (!key) return L.json(503, { error: 'Layanan AI belum dikonfigurasi di server.' });
    if (!(await L.rate('ai:' + s.id, 30, 3600))) return L.json(429, { error: 'Batas 30 permintaan AI per jam tercapai.' });
    let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return L.json(400, { error: 'Format tidak valid.' }); }
    const m = Array.isArray(b.messages) ? b.messages.slice(-20) : [];
    if (!m.length || m.some(x => typeof x.content !== 'string' || !['user', 'assistant'].includes(x.role))) return L.json(400, { error: 'Pesan tidak valid.' });
    if (m.reduce((n, x) => n + x.content.length, 0) > 12000) return L.json(413, { error: 'Pesan terlalu panjang (maks 12.000 karakter).' });
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ contents: m.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] })) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('Gemini', r.status, JSON.stringify(d).slice(0, 300)); return L.json(502, { error: 'Layanan AI sedang bermasalah. Coba lagi.' }); }
    const reply = (((d.candidates || [])[0] || {}).content || {}).parts; const text = reply ? reply.map(p => p.text || '').join('') : '';
    if (!text) return L.json(502, { error: 'AI tidak memberi jawaban (mungkin diblokir filter keamanan).' });
    return L.json(200, { reply: text });
  } catch (e) { console.error(e); return L.json(500, { error: 'Kesalahan server.' }); }
};
