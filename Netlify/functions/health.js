// Pemeriksaan status backend. Tidak pernah mengungkap nilai rahasia environment.
const L = require('./_lib');
exports.handler = async event => {
  if (event.httpMethod !== 'GET') return L.json(405, { error: 'Metode tidak diizinkan.' });
  return L.json(200, {
    ok: true,
    services: {
      auth: { configured: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) },
      gemini: { configured: Boolean(process.env.GEMINI_API_KEY) },
      rembg: { configured: Boolean(process.env.REMOVEBG_API_KEY) },
      proxy: { configured: true }
    }
  });
};
