class ProviderAdapterDisabledError extends Error {
  constructor(providerCode, reason = "disabled") {
    super(`Provider adapter ${providerCode} is not executable (${reason})`);
    this.name = "ProviderAdapterDisabledError";
    this.code = "PROVIDER_ADAPTER_DISABLED";
    this.providerCode = providerCode;
    this.reason = reason;
  }
}

module.exports = ProviderAdapterDisabledError;
