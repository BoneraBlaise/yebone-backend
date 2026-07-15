const REFERENCE_METHODS = Object.freeze([
  "buildProviderReference",
  "validateProviderReference",
  "buildProviderReferenceMetadata",
]);

/**
 * Ensures adapters expose the provider reference contract.
 */
class ProviderReferenceInterface {
  static REFERENCE_METHODS = REFERENCE_METHODS;

  static assertImplementation(adapter, providerCode = "UNKNOWN") {
    if (!adapter || typeof adapter !== "object") {
      throw new Error(`Provider adapter ${providerCode} must expose reference contract`);
    }

    if (!adapter.providerReference || typeof adapter.providerReference !== "object") {
      throw new Error(`Provider adapter ${providerCode} must expose providerReference contract`);
    }

    for (const method of REFERENCE_METHODS) {
      if (typeof adapter[method] !== "function") {
        throw new Error(`Provider adapter ${providerCode} must implement ${method}()`);
      }
    }

    return true;
  }
}

module.exports = ProviderReferenceInterface;
