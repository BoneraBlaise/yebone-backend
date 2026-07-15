const ProviderAdapterConfig = require("../ProviderAdapterConfig");

/**
 * Immutable normalized inbound provider request.
 */
class ProviderRequest {
  static create(input = {}) {
    return ProviderRequest.normalize(input);
  }

  static normalize(input = {}) {
    const providerCode = ProviderRequest._normalizeCode(input.providerCode);
    const country = ProviderRequest._normalizeCountry(input.country || input.countryCode);
    const currency = ProviderRequest._normalizeCurrency(input.currency);
    const paymentMethod = ProviderRequest._normalizeMethod(
      input.paymentMethod || input.method
    );
    const amount = ProviderRequest._normalizeAmount(input.amount);
    const reference = String(input.reference || input.paymentReference || "").trim();
    const metadata = ProviderRequest._freezeObject(input.metadata);
    const trace = ProviderRequest._freezeObject(input.trace || input.context);

    return Object.freeze({
      operation: input.operation ? String(input.operation).trim().toLowerCase() : null,
      providerCode,
      country,
      currency,
      paymentMethod,
      amount,
      reference,
      metadata,
      trace,
      payload: ProviderRequest._freezeObject(input.payload),
    });
  }

  static _normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  static _normalizeCountry(value) {
    return String(value || "").trim().toUpperCase();
  }

  static _normalizeCurrency(value) {
    const currency = String(value || ProviderAdapterConfig.defaultCurrency || "RWF")
      .trim()
      .toUpperCase();
    return currency || "RWF";
  }

  static _normalizeMethod(value) {
    return String(value || "").trim().toUpperCase();
  }

  static _normalizeAmount(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  }

  static _freezeObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Object.freeze({});
    }
    return Object.freeze({ ...value });
  }
}

module.exports = ProviderRequest;
