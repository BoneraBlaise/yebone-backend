const crypto = require("node:crypto");

/**
 * Normalizes webhook HTTP request context — correlation and payload material for verification.
 */
class WebhookRequestContext {
  static fromHttpRequest(req, config = {}) {
    const correlationHeader = config.correlationHeader || "x-correlation-id";
    const correlationId =
      String(req.headers[correlationHeader] || req.headers["X-Correlation-Id"] || "").trim() ||
      crypto.randomUUID();

    const providerCode = WebhookRequestContext._normalizeProviderCode(req.params?.providerCode);
    const payload = req.body;
    const payloadMaterial =
      typeof req.rawBody === "string" && req.rawBody.length > 0
        ? req.rawBody
        : typeof payload === "string"
          ? payload
          : JSON.stringify(payload || {});

    return Object.freeze({
      providerCode,
      correlationId,
      payload,
      payloadMaterial,
      headers: Object.freeze({ ...(req.headers || {}) }),
      signature:
        req.headers["x-paypack-signature"] ||
        req.headers["x-mtn-signature"] ||
        req.headers["x-signature"] ||
        null,
    });
  }

  static _normalizeProviderCode(code) {
    return String(code || "").trim().toUpperCase();
  }
}

module.exports = WebhookRequestContext;
