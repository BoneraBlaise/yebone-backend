class ProviderNotRegisteredError extends Error {
  constructor(providerCode) {
    super(`Provider is not registered: ${providerCode}`);
    this.name = "ProviderNotRegisteredError";
    this.code = "PROVIDER_NOT_REGISTERED";
    this.providerCode = providerCode;
  }
}

module.exports = ProviderNotRegisteredError;
