const { createHash, createHmac, timingSafeEqual } = require("node:crypto");

/**
 * Request signing utilities for provider APIs.
 */
class ProviderRequestSigner {
  static basicAuth(username, password) {
    const token = Buffer.from(`${username}:${password}`).toString("base64");
    return `Basic ${token}`;
  }

  static sha256Body(body) {
    const payload = typeof body === "string" ? body : JSON.stringify(body || {});
    return createHash("sha256").update(payload).digest("hex");
  }

  static hmacSha256(secret, payload) {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  static verifyHmacSha256(secret, payload, signature) {
    if (!secret || !signature) {
      return false;
    }
    const expected = ProviderRequestSigner.hmacSha256(secret, payload);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(String(signature));
    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  static signRequest({ headers = {}, subscriptionKey, bearerToken, idempotencyKey, correlationId }) {
    const signed = { ...headers };
    if (subscriptionKey) {
      signed["Ocp-Apim-Subscription-Key"] = subscriptionKey;
    }
    if (bearerToken) {
      signed.Authorization = `Bearer ${bearerToken}`;
    }
    if (idempotencyKey) {
      signed["X-Reference-Id"] = idempotencyKey;
    }
    if (correlationId) {
      signed["X-Correlation-Id"] = correlationId;
    }
    return Object.freeze(signed);
  }
}

module.exports = ProviderRequestSigner;
