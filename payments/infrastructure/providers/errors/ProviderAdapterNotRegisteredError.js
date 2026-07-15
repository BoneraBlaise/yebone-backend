class ProviderAdapterNotRegisteredError extends Error {
  constructor(providerCode) {
    super(`Provider adapter ${providerCode} is not registered`);
    this.name = "ProviderAdapterNotRegisteredError";
    this.code = "PROVIDER_ADAPTER_NOT_REGISTERED";
    this.providerCode = providerCode;
  }
}

module.exports = ProviderAdapterNotRegisteredError;
