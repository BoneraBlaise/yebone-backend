class ProviderCapabilityError extends Error {
  constructor(providerCode, operation, capability) {
    super(
      `Provider ${providerCode} does not support ${operation} (requires ${capability})`
    );
    this.name = "ProviderCapabilityError";
    this.code = "PROVIDER_CAPABILITY_UNSUPPORTED";
    this.providerCode = providerCode;
    this.operation = operation;
    this.capability = capability;
  }
}

module.exports = ProviderCapabilityError;
