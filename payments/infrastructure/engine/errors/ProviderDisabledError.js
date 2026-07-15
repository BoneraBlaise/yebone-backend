class ProviderDisabledError extends Error {
  constructor(providerCode) {
    super(`Provider is disabled: ${providerCode}`);
    this.name = "ProviderDisabledError";
    this.code = "PROVIDER_DISABLED";
    this.providerCode = providerCode;
  }
}

module.exports = ProviderDisabledError;
