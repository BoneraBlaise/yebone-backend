class ProviderHttpError extends Error {
  constructor(message, { statusCode, providerCode, body, code = "PROVIDER_HTTP_ERROR" } = {}) {
    super(message);
    this.name = "ProviderHttpError";
    this.code = code;
    this.statusCode = statusCode ?? null;
    this.providerCode = providerCode || null;
    this.body = body || null;
  }
}

module.exports = ProviderHttpError;
