const PLACEHOLDER_VALUE = "your-placeholder-value";

const isPlaceholderConfigValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === PLACEHOLDER_VALUE) return true;
  return normalized.includes("placeholder");
};

/**
 * Returns true only when SMTP is configured for a real remote mail service.
 * Prevents nodemailer from defaulting to localhost:587 in production.
 */
function isSmtpConfigured(env = process.env) {
  const host = String(env.SMPT_HOST || "").trim().toLowerCase();
  if (!host || isPlaceholderConfigValue(host)) return false;
  if (host === "localhost" || host === "127.0.0.1") return false;

  const mail = String(env.SMPT_MAIL || "").trim();
  const password = String(env.SMPT_PASSWORD || "").trim();
  if (isPlaceholderConfigValue(mail) || isPlaceholderConfigValue(password)) return false;
  return Boolean(mail && password);
}

module.exports = isSmtpConfigured;
module.exports.PLACEHOLDER_VALUE = PLACEHOLDER_VALUE;
module.exports.isPlaceholderConfigValue = isPlaceholderConfigValue;
