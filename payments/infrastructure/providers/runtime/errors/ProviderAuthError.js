class ProviderAuthError extends Error {
  constructor(message, { providerCode, code = "PROVIDER_AUTH_ERROR" } = {}) {
    super(message);
    this.name = "ProviderAuthError";
    this.code = code;
    this.providerCode = providerCode || null;
  }
}

module.exports = ProviderAuthError;
