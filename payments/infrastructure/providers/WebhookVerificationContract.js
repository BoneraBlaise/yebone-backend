const ProviderRequest = require("./models/ProviderRequest");

/**
 * Design contract for Module 10 webhook cryptography — mock-only at Module 9.
 */
class WebhookVerificationContract {
  static isCryptographyImplemented() {
    return false;
  }

  static describeFutureBehavior() {
    return Object.freeze({
      module: 10,
      cryptographyImplemented: false,
      verifyWebhook:
        "Parse webhook envelope, validate timestamp tolerance, verify provider signature",
      verifySignature:
        "Compare computed HMAC/hash against provider-supplied signature header",
      secretsRequired: true,
      httpRequired: false,
    });
  }

  static mockVerifyWebhook(input = {}) {
    return WebhookVerificationContract._mockResult("verifyWebhook", input);
  }

  static mockVerifySignature(input = {}) {
    return WebhookVerificationContract._mockResult("verifySignature", input);
  }

  static _mockResult(method, input = {}) {
    const request = ProviderRequest.normalize(input);

    return Object.freeze({
      verified: false,
      mock: true,
      cryptographyImplemented: false,
      method,
      status: "MOCK_NOT_VERIFIED",
      providerCode: request.providerCode || null,
      message: "Webhook cryptography deferred to Module 10",
      details: Object.freeze({
        signatureChecked: false,
        payloadDigest: null,
        reference: request.reference || null,
      }),
    });
  }
}

module.exports = WebhookVerificationContract;
