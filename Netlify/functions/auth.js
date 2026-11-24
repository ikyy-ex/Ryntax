import crypto from "crypto";
import { getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalKey] = storedHash.split(":");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalKey, "hex");
  if (derivedKey.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(derivedKey, originalBuf);
}

function createToken(userId, email) {
  const secret = process.env.AUTH_SECRET || "ryntax-dev-secret-change-in-env";
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // berlaku 7 hari
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export const handler = async (event) => {
  // Tangani preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "Metode tidak diizinkan. Gunakan POST.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "Format body permintaan harus berupa JSON yang valid.",
    });
  }

  const action = (body.action || body.mode || "register").toLowerCase().trim();
  const name = (body.name || "").trim();
  const email = (body.email || "").toLowerCase().trim();
  const password = body.password || "";

  if (!email || !password) {
    return jsonResponse(400, {
      ok: false,
      error: "Email dan password wajib diisi.",
    });
  }

  const usersStore = getStore({ name: "ryntax-users", consistency: "strong" });
  const userKey = encodeURIComponent(email);

  try {
    if (action === "register" || action === "signup" || action === "daftar") {
      if (!name) {
        return jsonResponse(400, {
          ok: false,
          error: "Nama wajib diisi untuk mendaftar.",
        });
      }
      if (password.length < 8) {
        return jsonResponse(400, {
          ok: false,
          error: "Password minimal 8 karakter.",
        });
      }

      const existingUser = await usersStore.get(userKey, { type: "json" });
      if (existingUser) {
        return jsonResponse(409, {
          ok: false,
          error: "Email sudah terdaftar. Silakan login.",
        });
      }

      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };

      await usersStore.setJSON(userKey, newUser);

      const token = createToken(newUser.id, newUser.email);
      return jsonResponse(201, {
        ok: true,
        message: "Akun Ryntax berhasil dibuat.",
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      });
    }

    if (action === "login" || action === "signin" || action === "masuk") {
      const user = await usersStore.get(userKey, { type: "json" });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return jsonResponse(401, {
          ok: false,
          error: "Email atau password salah.",
        });
      }

      const token = createToken(user.id, user.email);
      return jsonResponse(200, {
        ok: true,
        message: "Login berhasil.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    }

    return jsonResponse(400, {
      ok: false,
      error: `Aksi '${action}' tidak dikenali.`,
    });
  } catch (err) {
    console.error("Auth function error:", err);
    return jsonResponse(500, {
      ok: false,
      error: "Terjadi kesalahan pada server autentikasi.",
    });
  }
};
