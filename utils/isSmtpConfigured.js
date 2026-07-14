/**
 * Returns true only when SMTP is configured for a real remote mail service.
 * Prevents nodemailer from defaulting to localhost:587 in production.
 */
function isSmtpConfigured(env = process.env) {
  const host = String(env.SMPT_HOST || "").trim().toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return false;

  const mail = String(env.SMPT_MAIL || "").trim();
  const password = String(env.SMPT_PASSWORD || "").trim();
  return Boolean(mail && password);
}

module.exports = isSmtpConfigured;
