const { ProviderOperation } = require("./ProviderOperation");

const REQUIRED_METHODS = Object.freeze([
  ProviderOperation.CHARGE,
  ProviderOperation.VERIFY,
  ProviderOperation.REFUND,
  ProviderOperation.PAYOUT,
  ProviderOperation.WEBHOOK,
  "health",
]);

/**
 * Validates that an object satisfies the provider adapter contract.
 * Interface-only — no runtime HTTP or SDK usage.
 */
class ProviderAdapterInterface {
  static REQUIRED_METHODS = REQUIRED_METHODS;

  static assertImplementation(adapter, providerCode = "UNKNOWN") {
    if (!adapter || typeof adapter !== "object") {
      throw new Error(`Provider adapter ${providerCode} must be an object`);
    }

    for (const method of REQUIRED_METHODS) {
      if (typeof adapter[method] !== "function") {
        throw new Error(
          `Provider adapter ${providerCode} must implement ${method}()`
        );
      }
    }

    return true;
  }

  static createContract() {
    return Object.freeze({
      methods: [...REQUIRED_METHODS],
      description: "Foundation provider adapter contract — mock responses only",
    });
  }
}

module.exports = ProviderAdapterInterface;
