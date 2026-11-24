# Deploy Ryntax (Netlify)
1. Ekstrak ZIP dan jadikan ISI folder `ryntax` sebagai root repository GitHub (file `index.html`, `netlify.toml`, `package.json`, dan folder `netlify/` harus sejajar). Import repository di Netlify (publish dir `.`, functions `netlify/functions`; `npm install` otomatis).
2. Site configuration > Environment variables:
   - `AUTH_SECRET` = string acak min. 32 karakter (contoh: `openssl rand -hex 32`)
   - `GEMINI_API_KEY` = kunci dari Google AI Studio (opsional: `GEMINI_MODEL`)
   - (opsional) `REMOVEBG_API_KEY` untuk Remove Background
3. Deploy, lalu uji di domain Netlify: daftar, login, favorit, Ryntax AI, logout.
Database: Netlify Blobs (permanen, tanpa setup tambahan). Kunci API hanya ada di server.
