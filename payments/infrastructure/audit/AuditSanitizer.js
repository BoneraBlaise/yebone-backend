const AuditConfig = require("./AuditConfig");

const FORBIDDEN_KEYS = new Set([
  "password",
  "passwd",
  "secret",
  "apikey",
  "api_key",
  "apiKey",
  "token",
  "jwt",
  "authorization",
  "auth",
  "cookie",
  "set-cookie",
  "pin",
  "otp",
  "cvv",
  "cvc",
  "cardnumber",
  "card_number",
  "pan",
  "privatekey",
  "private_key",
  "client_secret",
  "webhook_secret",
  "signing_secret",
]);

const REDACTED = "[REDACTED]";

/**
 * Sanitizes audit payloads — removes secrets and sensitive provider data.
 */
class AuditSanitizer {
  static sanitize(value, depth = 0) {
    if (value === null || value === undefined) {
      return value;
    }

    if (depth > AuditConfig.maxPayloadDepth) {
      return "[TRUNCATED_DEPTH]";
    }

    if (Array.isArray(value)) {
      return value.map((item) => AuditSanitizer.sanitize(item, depth + 1));
    }

    if (typeof value !== "object") {
      if (typeof value === "string" && AuditSanitizer.looksLikeJwt(value)) {
        return REDACTED;
      }
      if (typeof value === "string" && AuditSanitizer.looksLikeCardNumber(value)) {
        return REDACTED;
      }
      return value;
    }

    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      if (AuditSanitizer.isForbiddenKey(key)) {
        output[key] = REDACTED;
        continue;
      }
      output[key] = AuditSanitizer.sanitize(nested, depth + 1);
    }
    return output;
  }

  static sanitizeRecord(record = {}) {
    return {
      ...record,
      before: AuditSanitizer.sanitize(record.before ?? null),
      after: AuditSanitizer.sanitize(record.after ?? null),
      metadata: AuditSanitizer.sanitize(record.metadata ?? {}),
      userAgent: record.userAgent ? AuditSanitizer.redactUserAgent(record.userAgent) : null,
    };
  }

  static isForbiddenKey(key) {
    const normalized = String(key).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return FORBIDDEN_KEYS.has(normalized);
  }

  static looksLikeJwt(value) {
    return /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(value);
  }

  static looksLikeCardNumber(value) {
    const digits = String(value).replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19;
  }

  static redactUserAgent(userAgent) {
    const value = String(userAgent);
    return value.length > 512 ? `${value.slice(0, 512)}…` : value;
  }
}

module.exports = AuditSanitizer;
