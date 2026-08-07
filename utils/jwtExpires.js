/**
 * Parse JWT_EXPIRES env (e.g. "7d", "24h", "3600") to milliseconds.
 */
function parseJwtExpiresMs(value = process.env.JWT_EXPIRES, fallbackMs = 7 * 24 * 60 * 60 * 1000) {
  const raw = String(value || "").trim();
  if (!raw) return fallbackMs;

  const match = /^(\d+(?:\.\d+)?)([smhd])?$/i.exec(raw);
  if (!match) {
    const asNumber = Number(raw);
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber * 1000 : fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit] || 1000);
}

function getJwtExpiresDate(fromMs = Date.now()) {
  return new Date(fromMs + parseJwtExpiresMs());
}

module.exports = { parseJwtExpiresMs, getJwtExpiresDate };
