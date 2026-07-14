const crypto = require("crypto");
const IdempotencyConfig = require("./IdempotencyConfig");

/**
 * Shared idempotency utilities — used by in-memory and MongoDB services.
 */
class IdempotencyHelper {
  static fingerprint(payload) {
    const normalized = JSON.stringify(payload, Object.keys(payload || {}).sort());
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  static normalizeKey(key) {
    const value = String(key || "").trim();
    if (!value) {
      throw new Error("idempotencyKey is required");
    }
    if (value.length > 256) {
      throw new Error("idempotencyKey exceeds maximum length of 256 characters");
    }
    return value;
  }

  static computeExpiresAt(ttlSeconds = IdempotencyConfig.defaultTtlSeconds) {
    return new Date(Date.now() + ttlSeconds * 1000);
  }

  static extractContext(req, options = {}) {
    const headers = req?.headers || {};
    const cfg = IdempotencyConfig.headers;
    const lower = (name) => headers[name] || headers[name.toLowerCase()];

    const idempotencyKey = lower(cfg.idempotencyKey);
    const correlationId =
      lower(cfg.correlationId) || req?.correlationId || crypto.randomUUID();
    const requestId = lower(cfg.requestId) || crypto.randomUUID();
    const paymentReference = lower(cfg.paymentReference) || null;

    const context = {
      idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null,
      correlationId: String(correlationId).trim(),
      requestId: String(requestId).trim(),
      paymentReference: paymentReference ? String(paymentReference).trim() : null,
    };

    if (options.requireKey && !context.idempotencyKey) {
      const err = new Error("Idempotency-Key header is required");
      err.statusCode = 400;
      err.code = "IDEMPOTENCY_KEY_REQUIRED";
      throw err;
    }

    return context;
  }

  static buildRecordKey(scope, idempotencyKey) {
    const scopePart = scope ? `${scope}:` : "";
    return `${scopePart}${IdempotencyHelper.normalizeKey(idempotencyKey)}`;
  }
}

module.exports = IdempotencyHelper;
