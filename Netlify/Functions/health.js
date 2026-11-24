const { json, cors } = require('./_lib');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  const e = process.env;
  return json(200, { ok: true, time: Date.now(), services: {
    gemini: { configured: !!e.GEMINI_API_KEY },
    rembg: { configured: !!e.REMOVEBG_API_KEY },
    proxy: { configured: true }
  } });
};
