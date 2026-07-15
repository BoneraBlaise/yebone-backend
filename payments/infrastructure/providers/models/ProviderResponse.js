const ProviderAdapterConfig = require("../ProviderAdapterConfig");

/**
 * Immutable normalized provider response envelope.
 */
class ProviderResponse {
  static success(result = {}) {
    return ProviderResponse.fromResult({
      success: true,
      ...result,
    });
  }

  static mock({
    providerCode,
    operation,
    reference,
    amount = null,
    currency = null,
    status = "MOCK_SUCCEEDED",
    externalReference = null,
    metadata = {},
  } = {}) {
    const prefix = ProviderAdapterConfig.mockResponsePrefix;
    const resolvedReference =
      externalReference ||
      `${prefix}_${providerCode}_${operation}_${reference || "unknown"}`.toLowerCase();

    return ProviderResponse.fromResult({
      success: true,
      mock: true,
      providerCode,
      operation,
      status,
      externalReference: resolvedReference,
      amount,
      currency,
      metadata,
    });
  }

  static failure(error) {
    if (error && typeof error.toJSON === "function") {
      return Object.freeze({
        success: false,
        mock: Boolean(error.mock),
        error: Object.freeze(error.toJSON()),
      });
    }

    return Object.freeze({
      success: false,
      mock: false,
      error: Object.freeze({
        code: "PROVIDER_RESPONSE_FAILURE",
        message: String(error?.message || error || "Provider operation failed"),
      }),
    });
  }

  static fromResult(result = {}) {
    const metadata = ProviderResponse._freezeObject(result.metadata);
    const data = ProviderResponse._freezeObject(result.data);

    return Object.freeze({
      success: Boolean(result.success),
      mock: Boolean(result.mock),
      providerCode: result.providerCode ? String(result.providerCode).toUpperCase() : null,
      operation: result.operation ? String(result.operation).toLowerCase() : null,
      status: result.status ? String(result.status) : null,
      externalReference: result.externalReference ? String(result.externalReference) : null,
      amount: result.amount ?? null,
      currency: result.currency ? String(result.currency).toUpperCase() : null,
      metadata,
      data,
    });
  }

  static _freezeObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Object.freeze({});
    }
    return Object.freeze({ ...value });
  }
}

module.exports = ProviderResponse;
