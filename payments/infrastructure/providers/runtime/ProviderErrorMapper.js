const ProviderError = require("../models/ProviderError");
const ProviderHttpError = require("./errors/ProviderHttpError");
const ProviderAuthError = require("./errors/ProviderAuthError");
const ProviderTimeoutError = require("./errors/ProviderTimeoutError");
const ProviderCredentialError = require("./errors/ProviderCredentialError");

/**
 * Maps runtime errors to normalized ProviderError.
 */
class ProviderErrorMapper {
  map(error, context = {}) {
    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof ProviderHttpError) {
      return new ProviderError(error.message, {
        code: error.statusCode ? `PROVIDER_HTTP_${error.statusCode}` : error.code,
        providerCode: error.providerCode || context.providerCode,
        operation: context.operation,
        details: { statusCode: error.statusCode, body: error.body },
      });
    }

    if (error instanceof ProviderAuthError) {
      return new ProviderError(error.message, {
        code: error.code,
        providerCode: error.providerCode || context.providerCode,
        operation: context.operation,
      });
    }

    if (error instanceof ProviderTimeoutError) {
      return new ProviderError(error.message, {
        code: error.code,
        providerCode: error.providerCode || context.providerCode,
        operation: context.operation,
        details: { timeoutMs: error.timeoutMs },
      });
    }

    if (error instanceof ProviderCredentialError) {
      return new ProviderError(error.message, {
        code: error.code,
        providerCode: error.providerCode || context.providerCode,
        operation: context.operation,
      });
    }

    return ProviderError.fromUnknown(error, context);
  }

  mapHttpStatus(statusCode, body, context = {}) {
    const message = body?.message || body?.error || `Provider HTTP ${statusCode}`;
    return new ProviderError(message, {
      code: `PROVIDER_HTTP_${statusCode}`,
      providerCode: context.providerCode,
      operation: context.operation,
      details: { statusCode, body },
    });
  }
}

module.exports = ProviderErrorMapper;
