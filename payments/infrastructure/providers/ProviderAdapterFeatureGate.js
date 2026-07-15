const ProviderAdapterDisabledError = require("./errors/ProviderAdapterDisabledError");
const ProviderAdapterNotRegisteredError = require("./errors/ProviderAdapterNotRegisteredError");

/**
 * Feature-flag and registry gate — adapters remain disabled by default.
 */
class ProviderAdapterFeatureGate {
  constructor({ registry, featureFlags }) {
    if (!registry) {
      throw new Error("ProviderAdapterFeatureGate requires registry");
    }
    if (!featureFlags) {
      throw new Error("ProviderAdapterFeatureGate requires featureFlags");
    }
    this.registry = registry;
    this.featureFlags = featureFlags;
  }

  isExecutable(providerCode) {
    const code = this._normalizeCode(providerCode);
    if (!this.registry.has(code)) {
      return false;
    }

    const entry = this.registry.resolve(code);
    if (!entry.enabled) {
      return false;
    }
    if (!this.featureFlags.isProviderEnabled(code)) {
      return false;
    }
    if (!entry.adapter) {
      return false;
    }

    return true;
  }

  assertExecutable(providerCode) {
    const code = this._normalizeCode(providerCode);

    if (!this.registry.has(code)) {
      throw new ProviderAdapterNotRegisteredError(code);
    }

    const entry = this.registry.resolve(code);

    if (!entry.adapter) {
      throw new ProviderAdapterNotRegisteredError(code);
    }

    if (!entry.enabled) {
      throw new ProviderAdapterDisabledError(code, "registry entry disabled");
    }

    if (!this.featureFlags.isProviderEnabled(code)) {
      throw new ProviderAdapterDisabledError(code, "feature flag disabled");
    }

    return entry;
  }

  getDescriptor(providerCode) {
    return this.registry.resolve(this._normalizeCode(providerCode));
  }

  _normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }
}

module.exports = ProviderAdapterFeatureGate;
