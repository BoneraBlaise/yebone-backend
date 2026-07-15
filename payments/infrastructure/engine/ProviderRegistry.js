const PaymentEngineConfig = require("./PaymentEngineConfig");
const DEFAULT_PROVIDER_MATRIX = require("./ProviderCapabilityMatrix");
const {
  normalizeCapabilityList,
  supports: capabilitySupports,
} = require("./ProviderCapabilities");
const ProviderNotRegisteredError = require("./errors/ProviderNotRegisteredError");

/**
 * Provider descriptor registry — metadata only, no API calls.
 * Each descriptor exposes supports(operation) without provider-specific branching.
 */
class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(descriptor = {}) {
    const code = this._normalizeCode(descriptor.code);
    if (!code) {
      throw new Error("Provider code is required");
    }

    const capabilities = normalizeCapabilityList(
      descriptor.capabilities || descriptor.supportedOperations || []
    );
    const supportedOperations = normalizeCapabilityList(
      descriptor.supportedOperations || capabilities
    );

    const entry = {
      code,
      name: descriptor.name || code,
      capabilities,
      supportedCountries: this._normalizeList(descriptor.supportedCountries),
      supportedCurrencies: this._normalizeList(descriptor.supportedCurrencies),
      supportedMethods: this._normalizeList(descriptor.supportedMethods),
      supportedOperations,
      enabled: descriptor.enabled === true,
      adapter: descriptor.adapter ?? null,
      metadata: descriptor.metadata || {},
      supports(operation) {
        return capabilitySupports(this.capabilities, operation);
      },
    };

    const frozen = Object.freeze(entry);
    this.providers.set(code, frozen);
    return frozen;
  }

  resolve(code) {
    const normalized = this._normalizeCode(code);
    const entry = this.providers.get(normalized);
    if (!entry) {
      throw new ProviderNotRegisteredError(normalized);
    }
    return entry;
  }

  list({ enabledOnly = false } = {}) {
    const all = Array.from(this.providers.values());
    if (!enabledOnly) {
      return all;
    }
    return all.filter((entry) => entry.enabled);
  }

  enable(code) {
    const entry = this.resolve(code);
    return this.register({ ...entry, enabled: true, adapter: entry.adapter });
  }

  disable(code) {
    const entry = this.resolve(code);
    return this.register({ ...entry, enabled: false, adapter: entry.adapter });
  }

  findByCountry(countryCode, { enabledOnly = false } = {}) {
    const normalized = this._normalizeCountry(countryCode);
    return this.list({ enabledOnly }).filter((entry) =>
      entry.supportedCountries.includes(normalized)
    );
  }

  findByPaymentMethod(paymentMethod, { enabledOnly = false } = {}) {
    const normalized = this._normalizeMethod(paymentMethod);
    return this.list({ enabledOnly }).filter((entry) =>
      entry.supportedMethods.includes(normalized)
    );
  }

  findByCapability(capability, { enabledOnly = false } = {}) {
    return this.list({ enabledOnly }).filter((entry) => entry.supports(capability));
  }

  has(code) {
    return this.providers.has(this._normalizeCode(code));
  }

  registerDefaults() {
    const { providerCodes } = PaymentEngineConfig;

    for (const code of Object.values(providerCodes)) {
      const matrix = DEFAULT_PROVIDER_MATRIX[code];
      if (!matrix) {
        continue;
      }
      this.register({
        code,
        enabled: false,
        ...matrix,
      });
    }

    return this.list();
  }

  _normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  _normalizeCountry(countryCode) {
    return String(countryCode || "").trim().toUpperCase();
  }

  _normalizeMethod(paymentMethod) {
    return String(paymentMethod || "").trim().toUpperCase();
  }

  _normalizeList(values) {
    if (!Array.isArray(values)) {
      return [];
    }
    return values.map((value) => String(value).trim().toUpperCase()).filter(Boolean);
  }
}

module.exports = ProviderRegistry;
