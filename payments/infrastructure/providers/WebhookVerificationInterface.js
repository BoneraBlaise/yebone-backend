/**
 * Future-ready webhook verification contract — Module 10 will implement cryptography.
 * No HMAC, signature, or certificate validation at Module 9.
 */
const WEBHOOK_VERIFICATION_METHODS = Object.freeze(["verifyWebhook", "verifySignature"]);

class WebhookVerificationInterface {
  static WEBHOOK_VERIFICATION_METHODS = WEBHOOK_VERIFICATION_METHODS;

  static assertImplementation(adapter, providerCode = "UNKNOWN") {
    if (!adapter || typeof adapter !== "object") {
      throw new Error(`Webhook verifier ${providerCode} must be an object`);
    }

    for (const method of WEBHOOK_VERIFICATION_METHODS) {
      if (typeof adapter[method] !== "function") {
        throw new Error(
          `Provider adapter ${providerCode} must implement ${method}() for webhook verification`
        );
      }
    }

    return true;
  }

  static createContract() {
    return Object.freeze({
      methods: [...WEBHOOK_VERIFICATION_METHODS],
      description:
        "Webhook authenticity verification contract — cryptography deferred to Module 10",
      module10Expectations: Object.freeze({
        verifyWebhook:
          "Validate provider webhook payload integrity and event authenticity",
        verifySignature:
          "Validate HMAC/signature headers against provider secret material",
      }),
    });
  }
}

module.exports = WebhookVerificationInterface;
