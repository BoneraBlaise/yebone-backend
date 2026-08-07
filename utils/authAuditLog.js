const crypto = require("crypto");

const SENSITIVE_KEYS = new Set([
  "password",
  "otp",
  "token",
  "cookie",
  "secret",
  "authorization",
  "resetSessionToken",
  "activation_token",
]);

function hashEmail(email) {
  return crypto.createHash("sha256").update(String(email).toLowerCase()).digest("hex").slice(0, 12);
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object") return undefined;
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || lower.includes("password") || lower.includes("token")) {
      continue;
    }
    clean[key] = value;
  }
  return Object.keys(clean).length ? clean : undefined;
}

/**
 * Structured auth audit log — no secrets, no OTP, no passwords, no tokens.
 */
function logAuthEvent(event, { userId, email, ip, success, reason, meta } = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    success: Boolean(success),
    userId: userId ? String(userId) : undefined,
    emailHash: email ? hashEmail(email) : undefined,
    ip: ip || undefined,
    reason: reason || undefined,
    meta: sanitizeMeta(meta),
  };

  console.info("[auth-audit]", JSON.stringify(entry));
  return entry;
}

module.exports = { logAuthEvent, hashEmail, sanitizeMeta };
