const ProviderResolver = require("../engine/ProviderResolver");
const ProviderNotResolvedError = require("../engine/errors/ProviderNotResolvedError");
const ProviderAdapterNotRegisteredError = require("./errors/ProviderAdapterNotRegisteredError");
const ProviderCurrencyNotSupportedError = require("./errors/ProviderCurrencyNotSupportedError");

/**
 * Resolves provider descriptors and adapters by code, country, currency, and method.
 * Delegates descriptor resolution to Module 4 ProviderResolver.
 */
class ProviderAdapterResolver {
  constructor({ providerResolver, registry, featureFlags }) {
    if (!providerResolver) {
      throw new Error("ProviderAdapterResolver requires providerResolver");
    }
    if (!registry) {
      throw new Error("ProviderAdapterResolver requires registry");
    }
    this.providerResolver = providerResolver;
    this.registry = registry;
    this.featureFlags = featureFlags;
  }

  resolve({
    providerCode,
    country,
    countryCode,
    currency,
    paymentMethod,
  } = {}) {
    const descriptor = this._resolveDescriptor({
      providerCode,
      country,
      countryCode,
      currency,
      paymentMethod,
    });

    return Object.freeze({
      descriptor,
      adapter: this._resolveAdapter(descriptor.code),
    });
  }

  listAvailable({ country, countryCode, currency, paymentMethod, capability } = {}) {
    const normalizedCountry = this._normalizeCountry(country || countryCode);
    const normalizedCurrency = this._normalizeCurrency(currency);
    const normalizedMethod = this._normalizeMethod(paymentMethod);

    let candidates = this.providerResolver.listAvailable({
      countryCode: normalizedCountry,
      paymentMethod: normalizedMethod,
      capability,
    });

    if (normalizedCurrency) {
      candidates = candidates.filter((entry) =>
        entry.supportedCurrencies.includes(normalizedCurrency)
      );
    }

    return candidates.map((descriptor) =>
      Object.freeze({
        descriptor,
        adapter: descriptor.adapter || null,
      })
    );
  }

  _resolveDescriptor({
    providerCode,
    country,
    countryCode,
    currency,
    paymentMethod,
  }) {
    const normalizedCountry = this._normalizeCountry(country || countryCode);
    const normalizedCurrency = this._normalizeCurrency(currency);
    const normalizedMethod = this._normalizeMethod(paymentMethod);

    let descriptor;
    try {
      descriptor = this.providerResolver.resolve({
        providerCode,
        countryCode: normalizedCountry,
        paymentMethod: normalizedMethod,
      });
    } catch (error) {
      if (
        !providerCode &&
        normalizedCurrency &&
        error instanceof ProviderNotResolvedError
      ) {
        descriptor = this._resolveByCurrency({
          countryCode: normalizedCountry,
          currency: normalizedCurrency,
          paymentMethod: normalizedMethod,
        });
      } else {
        throw error;
      }
    }

    if (
      normalizedCurrency &&
      descriptor.supportedCurrencies.length > 0 &&
      !descriptor.supportedCurrencies.includes(normalizedCurrency)
    ) {
      throw new ProviderCurrencyNotSupportedError(descriptor.code, normalizedCurrency);
    }

    return descriptor;
  }

  _resolveByCurrency({ countryCode, currency, paymentMethod }) {
    let candidates = this.registry.list({ enabledOnly: true }).filter((entry) => {
      const countryMatch =
        !countryCode || entry.supportedCountries.includes(countryCode);
      const currencyMatch = entry.supportedCurrencies.includes(currency);
      const methodMatch =
        !paymentMethod || entry.supportedMethods.includes(paymentMethod);
      const flagEnabled = this.featureFlags?.isProviderEnabled?.(entry.code);
      return countryMatch && currencyMatch && methodMatch && flagEnabled;
    });

    if (candidates.length === 0) {
      throw new ProviderNotResolvedError({ countryCode, paymentMethod, currency });
    }

    return candidates[0];
  }

  _resolveAdapter(providerCode) {
    const entry = this.registry.resolve(providerCode);
    if (!entry.adapter) {
      throw new ProviderAdapterNotRegisteredError(providerCode);
    }
    return entry.adapter;
  }

  _normalizeCountry(value) {
    return value ? String(value).trim().toUpperCase() : undefined;
  }

  _normalizeCurrency(value) {
    return value ? String(value).trim().toUpperCase() : undefined;
  }

  _normalizeMethod(value) {
    return value ? String(value).trim().toUpperCase() : undefined;
  }
}

module.exports = ProviderAdapterResolver;
