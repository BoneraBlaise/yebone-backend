const RuntimeConfig = require("./RuntimeConfig");

/**
 * Parallel registry for Module 10 runtime adapters — no global singleton.
 */
class RuntimeAdapterRegistry {
  constructor() {
    this.adapters = new Map();
  }

  register(providerCode, runtimeAdapter, descriptorOverrides = {}) {
    const code = this._normalizeCode(providerCode);
    if (!runtimeAdapter) {
      throw new Error("RuntimeAdapterRegistry.register requires runtimeAdapter");
    }

    const entry = Object.freeze({
      providerCode: code,
      adapter: runtimeAdapter,
      descriptor: Object.freeze({
        code,
        enabled: descriptorOverrides.enabled === true,
        ...descriptorOverrides,
      }),
      registeredAt: new Date().toISOString(),
    });

    this.adapters.set(code, entry);
    return entry;
  }

  unregister(providerCode) {
    return this.adapters.delete(this._normalizeCode(providerCode));
  }

  has(providerCode) {
    return this.adapters.has(this._normalizeCode(providerCode));
  }

  get(providerCode) {
    const entry = this.adapters.get(this._normalizeCode(providerCode));
    return entry ? entry : null;
  }

  list() {
    return Object.freeze(Array.from(this.adapters.values()));
  }

  clear() {
    this.adapters.clear();
  }

  health() {
    const providers = this.list().map((entry) =>
      Object.freeze({
        providerCode: entry.providerCode,
        enabled: entry.descriptor.enabled,
        hasAdapter: Boolean(entry.adapter),
        registeredAt: entry.registeredAt,
      })
    );

    return Object.freeze({
      ready: true,
      count: providers.length,
      providers,
      version: RuntimeConfig.version,
    });
  }

  _normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }
}

module.exports = RuntimeAdapterRegistry;
