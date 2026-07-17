const crypto = require("node:crypto");
const IdempotencyHelper = require("../../infrastructure/idempotency/IdempotencyHelper");

/**
 * Builds deterministic webhook idempotency keys.
 */
class WebhookIdempotencyKeyBuilder {
  static build({ providerCode, providerEventId, providerReference, eventType, payloadMaterial }) {
    const code = String(providerCode || "").trim().toUpperCase();
    if (!code) {
      throw new Error("providerCode is required for webhook idempotency key");
    }

    if (providerEventId) {
      return `webhook:${code}:${String(providerEventId).trim()}`;
    }

    if (providerReference && eventType) {
      return `webhook:${code}:ref:${String(providerReference).trim()}:${String(eventType).trim()}`;
    }

    const material =
      payloadMaterial ||
      JSON.stringify({ providerReference, eventType });
    const hash = crypto.createHash("sha256").update(String(material)).digest("hex");
    return `webhook:${code}:hash:${hash.slice(0, 32)}`;
  }

  static fingerprint(payload) {
    return IdempotencyHelper.fingerprint(payload);
  }
}

module.exports = WebhookIdempotencyKeyBuilder;
