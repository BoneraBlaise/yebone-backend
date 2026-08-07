const crypto = require("crypto");

function hashEmail(email) {
  return crypto.createHash("sha256").update(String(email).toLowerCase()).digest("hex").slice(0, 12);
}

/**
 * Structured auth audit log — no secrets, no OTP, no passwords.
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
    meta: meta || undefined,
  };

  console.info("[auth-audit]", JSON.stringify(entry));
  return entry;
}

module.exports = { logAuthEvent, hashEmail };
