const L = require('./_lib');
const ID = /^[a-z0-9-]{2,60}$/;
exports.handler = async event => {
  try {
    const s = L.session(event); if (!s) return L.json(401, { error: 'Silakan login.' });
    if (event.httpMethod !== 'GET' && !L.sameOrigin(event)) return L.json(403, { error: 'Origin tidak diizinkan.' });
    const db = L.store('userdata'); const d = (await db.get(s.uid)) || { favs: [], history: [] };
    if (event.httpMethod === 'GET') return L.json(200, d);
    if (event.httpMethod !== 'POST') return L.json(405, { error: 'Metode tidak diizinkan.' });
    let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return L.json(400, { error: 'Format tidak valid.' }); }
    if (b.action === 'fav') { if (!ID.test(String(b.tool))) return L.json(400, { error: 'ID tool tidak valid.' }); const i = d.favs.indexOf(b.tool); if (i >= 0) d.favs.splice(i, 1); else d.favs.push(b.tool); }
    else if (b.action === 'history') { if (!ID.test(String(b.tool))) return L.json(400, { error: 'ID tool tidak valid.' }); d.history.unshift({ tool: b.tool, t: new Date().toISOString() }); d.history = d.history.slice(0, 100); }
    else if (b.action === 'clear-history') d.history = [];
    else return L.json(400, { error: 'Aksi tidak dikenal.' });
    await db.set(s.uid, d); return L.json(200, d);
  } catch (e) { console.error(e); return L.json(500, { error: 'Kesalahan server.' }); }
};
