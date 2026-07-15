const ProviderNotResolvedError = require("./errors/ProviderNotResolvedError");
const ProviderDisabledError = require("./errors/ProviderDisabledError");

/**
 * Resolves provider descriptors from registry using code, country, and payment method.
 * Does not invoke provider adapters.
 */
class ProviderResolver {
  constructor({ registry, featureFlags }) {
    if (!registry) {
      throw new Error("ProviderResolver requires a registry");
    }
    if (!featureFlags) {
      throw new Error("ProviderResolver requires a featureFlags registry");
    }
    this.registry = registry;
    this.featureFlags = featureFlags;
  }

  resolve({ providerCode, countryCode, paymentMethod } = {}) {
    if (providerCode) {
      return this._resolveByCode(providerCode);
    }

    const candidates = this._filterCandidates(countryCode, paymentMethod);
    if (candidates.length === 0) {
      throw new ProviderNotResolvedError({ countryCode, paymentMethod });
    }

    const enabled = candidates.filter(
      (entry) => entry.enabled && this.featureFlags.isProviderEnabled(entry.code)
    );
    if (enabled.length === 0) {
      throw new ProviderDisabledError(candidates[0].code);
    }

    return enabled[0];
  }

  listAvailable({ countryCode, paymentMethod, capability } = {}) {
    let candidates = this._filterCandidates(countryCode, paymentMethod);
    if (capability) {
      candidates = candidates.filter((entry) => entry.supports(capability));
    }
    return candidates.filter(
      (entry) => entry.enabled && this.featureFlags.isProviderEnabled(entry.code)
    );
  }

  supports(providerCode, operation) {
    const entry = this.registry.resolve(providerCode);
    return entry.supports(operation);
  }

  findByCapability(capability, { enabledOnly = false } = {}) {
    return this.registry.findByCapability(capability, { enabledOnly });
  }

  _resolveByCode(providerCode) {
    const entry = this.registry.resolve(providerCode);
    if (!entry.enabled) {
      throw new ProviderDisabledError(entry.code);
    }
    if (!this.featureFlags.isProviderEnabled(entry.code)) {
      throw new ProviderDisabledError(entry.code);
    }
    return entry;
  }

  _filterCandidates(countryCode, paymentMethod) {
    let candidates = this.registry.list();

    if (countryCode) {
      candidates = this.registry.findByCountry(countryCode);
    }
    if (paymentMethod) {
      const methodMatches = this.registry.findByPaymentMethod(paymentMethod);
      const methodCodes = new Set(methodMatches.map((entry) => entry.code));
      candidates = candidates.filter((entry) => methodCodes.has(entry.code));
    }

    return candidates;
  }
}

module.exports = ProviderResolver;
