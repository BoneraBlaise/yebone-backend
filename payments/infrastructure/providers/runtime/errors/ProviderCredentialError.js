class ProviderCredentialError extends Error {
  constructor(message, { providerCode, code = "PROVIDER_CREDENTIAL_ERROR" } = {}) {
    super(message);
    this.name = "ProviderCredentialError";
    this.code = code;
    this.providerCode = providerCode || null;
  }
}

module.exports = ProviderCredentialError;
