/**
 * In-memory runtime configuration store.
 */
class RuntimeConfiguration {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
    this.featureFlags = new Map();
  }

  get(key, defaultValue = null) {
    return this.values.has(key) ? this.values.get(key) : defaultValue;
  }

  set(key, value) {
    this.values.set(key, value);
    return this;
  }

  has(key) {
    return this.values.has(key);
  }

  all() {
    return Object.fromEntries(this.values.entries());
  }

  setFeatureFlag(name, enabled) {
    this.featureFlags.set(name, Boolean(enabled));
    return this;
  }

  isFeatureEnabled(name, defaultValue = false) {
    return this.featureFlags.has(name) ? this.featureFlags.get(name) : defaultValue;
  }

  getFeatureFlags() {
    return Object.fromEntries(this.featureFlags.entries());
  }
}

module.exports = RuntimeConfiguration;
