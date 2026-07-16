const ProviderError = require("../models/ProviderError");
const ProviderHttpError = require("./errors/ProviderHttpError");
const ProviderAuthError = require("./errors/ProviderAuthError");
const ProviderTimeoutError = require("./errors/ProviderTimeoutError");
const ProviderCredentialError = require("./errors/ProviderCredentialError");
const SecretRedactor = require("./security/SecretRedactor");

/**
 * Maps runtime errors to normalized ProviderError.
 */
class ProviderErrorMapper {
  map(error, context = {}) {
    if (error instanceof ProviderError) {
      return this._sanitizeProviderError(error);
    }

    if (error instanceof ProviderHttpError) {
      return this._sanitizeProviderError(
        new ProviderError(error.message, {
          code: error.statusCode ? `PROVIDER_HTTP_${error.statusCode}` : error.code,
          providerCode: error.providerCode || context.providerCode,
          operation: context.operation,
          details: this._sanitizeDetails({
            statusCode: error.statusCode,
            body: error.body,
            headers: error.headers,
            credentials: error.credentials,
          }),
        })
      );
    }

    if (error instanceof ProviderAuthError) {
      return this._sanitizeProviderError(
        new ProviderError(error.message, {
          code: error.code,
          providerCode: error.providerCode || context.providerCode,
          operation: context.operation,
          details: this._sanitizeDetails(error.details),
        })
      );
    }

    if (error instanceof ProviderTimeoutError) {
      return this._sanitizeProviderError(
        new ProviderError(error.message, {
          code: error.code,
          providerCode: error.providerCode || context.providerCode,
          operation: context.operation,
          details: this._sanitizeDetails({ timeoutMs: error.timeoutMs }),
        })
      );
    }

    if (error instanceof ProviderCredentialError) {
      return this._sanitizeProviderError(
        new ProviderError(error.message, {
          code: error.code,
          providerCode: error.providerCode || context.providerCode,
          operation: context.operation,
          details: this._sanitizeDetails(error.details),
        })
      );
    }

    return this._sanitizeProviderError(ProviderError.fromUnknown(error, context));
  }

  mapHttpStatus(statusCode, body, context = {}) {
    const message = body?.message || body?.error || `Provider HTTP ${statusCode}`;
    return this._sanitizeProviderError(
      new ProviderError(message, {
        code: `PROVIDER_HTTP_${statusCode}`,
        providerCode: context.providerCode,
        operation: context.operation,
        details: this._sanitizeDetails({ statusCode, body, headers: context.headers }),
      })
    );
  }

  _sanitizeDetails(details = {}) {
    if (!details || typeof details !== "object") {
      return details;
    }

    const sanitized = SecretRedactor.redact(details);
    if (sanitized.headers) {
      sanitized.headers = SecretRedactor.redactHeaders(sanitized.headers);
    }
    if (sanitized.credentials) {
      sanitized.credentials = SecretRedactor.redactCredentials(sanitized.credentials);
    }
    return Object.freeze(sanitized);
  }

  _sanitizeProviderError(error) {
    if (!(error instanceof ProviderError)) {
      return error;
    }

    const sanitizedDetails = error.details ? this._sanitizeDetails(error.details) : undefined;
    if (sanitizedDetails === error.details) {
      return error;
    }

    return new ProviderError(error.message, {
      code: error.code,
      providerCode: error.providerCode,
      operation: error.operation,
      details: sanitizedDetails,
    });
  }
}

module.exports = ProviderErrorMapper;
