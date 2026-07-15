/**
 * Immutable normalized provider error model.
 */
class ProviderError extends Error {
  constructor(message, { code, providerCode, operation, details = {}, mock = false } = {}) {
    super(message);
    this.name = "ProviderError";
    this.code = code || "PROVIDER_ERROR";
    this.providerCode = providerCode ? String(providerCode).toUpperCase() : null;
    this.operation = operation ? String(operation).toLowerCase() : null;
    this.details = Object.freeze({ ...details });
    this.mock = Boolean(mock);
  }

  toJSON() {
    return Object.freeze({
      name: this.name,
      code: this.code,
      message: this.message,
      providerCode: this.providerCode,
      operation: this.operation,
      details: this.details,
      mock: this.mock,
    });
  }

  static fromUnknown(error, context = {}) {
    if (error instanceof ProviderError) {
      return error;
    }

    return new ProviderError(String(error?.message || error || "Unknown provider error"), {
      code: error?.code || "PROVIDER_UNKNOWN_ERROR",
      providerCode: context.providerCode,
      operation: context.operation,
      details: context.details || {},
      mock: Boolean(context.mock),
    });
  }
}

module.exports = ProviderError;
