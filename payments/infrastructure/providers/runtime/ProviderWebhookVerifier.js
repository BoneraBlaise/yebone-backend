const { createHmac, timingSafeEqual } = require("node:crypto");
const WebhookVerificationContract = require("../WebhookVerificationContract");
const ProviderReferenceContract = require("../ProviderReferenceContract");

/**
 * Runtime webhook verification — uses Module 9 contract semantics with HMAC architecture.
 */
class ProviderWebhookVerifier {
  constructor(providerCode) {
    this.providerCode = String(providerCode || "").trim().toUpperCase();
    this.referenceContract = new ProviderReferenceContract(this.providerCode);
  }

  verifyWebhook(input = {}) {
    const secret = input.webhookSecret || input.secret;
    const payload = typeof input.payload === "string" ? input.payload : JSON.stringify(input.payload || {});
    const signature = input.signature || input.headers?.["x-paypack-signature"] || input.headers?.["x-mtn-signature"];

    if (!secret || !signature) {
      return Object.freeze({
        ...WebhookVerificationContract.mockVerifyWebhook({
          ...input,
          providerCode: this.providerCode,
        }),
        verified: false,
        reason: "MISSING_SECRET_OR_SIGNATURE",
      });
    }

    const verified = ProviderWebhookVerifier._verifyHmac(payload, secret, signature);
    const references = this.referenceContract.buildReference({
      providerCode: this.providerCode,
      reference: input.reference,
      providerReference: input.providerReference,
      merchantReference: input.merchantReference,
    });

    return Object.freeze({
      verified,
      mock: false,
      cryptographyImplemented: true,
      method: "verifyWebhook",
      status: verified ? "VERIFIED" : "SIGNATURE_INVALID",
      providerCode: this.providerCode,
      references: Object.freeze({
        providerReference: references.providerReference,
        merchantReference: references.merchantReference,
      }),
      message: verified ? "Webhook signature verified" : "Webhook signature invalid",
    });
  }

  verifySignature(input = {}) {
    const result = this.verifyWebhook(input);
    return Object.freeze({
      ...result,
      method: "verifySignature",
    });
  }

  static _verifyHmac(payload, secret, signature) {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(String(signature));
    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }
}

module.exports = ProviderWebhookVerifier;
