class ProviderTimeoutError extends Error {
  constructor(message, { providerCode, timeoutMs, code = "PROVIDER_TIMEOUT" } = {}) {
    super(message);
    this.name = "ProviderTimeoutError";
    this.code = code;
    this.providerCode = providerCode || null;
    this.timeoutMs = timeoutMs ?? null;
  }
}

module.exports = ProviderTimeoutError;
