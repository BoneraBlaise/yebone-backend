const crypto = require("crypto");

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class ReferralAttributionService {
  constructor({ secret, ttlMs = DEFAULT_TTL_MS } = {}) {
    this.secret =
      secret ||
      process.env.REFERRAL_ATTRIBUTION_SECRET ||
      process.env.JWT_SECRET_KEY ||
      "growth-attribution-dev-secret";
    this.ttlMs = ttlMs;
  }

  createAttributionToken({ referralCode, productId = null, shopId = null }) {
    if (!referralCode) {
      throw new Error("referralCode is required");
    }
    const payload = {
      referralCode: String(referralCode).toUpperCase(),
      productId: productId ? String(productId) : null,
      shopId: shopId ? String(shopId) : null,
      exp: Date.now() + this.ttlMs,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = this._sign(body);
    return `${body}.${signature}`;
  }

  verifyAttributionToken(token) {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      return { valid: false, reason: "INVALID_TOKEN_FORMAT" };
    }
    const [body, signature] = token.split(".");
    const expected = this._sign(body);
    const sigBuffer = Buffer.from(String(signature));
    const expectedBuffer = Buffer.from(expected);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: false, reason: "INVALID_SIGNATURE" };
    }
    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      if (!payload.referralCode) return { valid: false, reason: "MISSING_REFERRAL_CODE" };
      if (payload.exp && Date.now() > payload.exp) return { valid: false, reason: "TOKEN_EXPIRED" };
      return { valid: true, payload };
    } catch (_error) {
      return { valid: false, reason: "INVALID_PAYLOAD" };
    }
  }

  resolveReferralFromTokens(tokens = []) {
    const list = Array.isArray(tokens) ? tokens : [tokens];
    for (const token of list) {
      const result = this.verifyAttributionToken(token);
      if (result.valid) return result.payload.referralCode;
    }
    return null;
  }

  _sign(body) {
    return crypto.createHmac("sha256", this.secret).update(body).digest("base64url");
  }
}

module.exports = ReferralAttributionService;
