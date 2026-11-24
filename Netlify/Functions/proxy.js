const { json, cors, guard } = require('./_lib');
const PRIVATE = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  if (!guard(event, 15)) return json(429, { error: 'Terlalu banyak permintaan.' });
  let u;
  try { u = new URL(event.queryStringParameters?.url || ''); } catch { return json(400, { error: 'Parameter url tidak valid.' }); }
  if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname)) return json(400, { error: 'URL tidak diizinkan.' });
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'RyntaxProxy/1.0' } });
    const t = await r.text();
    if (t.length > 2e6) return json(413, { error: 'Respons lebih dari 2 MB.' });
    return { statusCode: r.status, headers: { ...cors(), 'Content-Type': 'text/plain; charset=utf-8' }, body: t };
  } catch { return json(504, { error: 'Sumber tidak merespons.' }); }
};
