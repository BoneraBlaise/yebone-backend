const METRIC_NAMES = Object.freeze([
  "oauth_cache_hit",
  "oauth_cache_miss",
  "provider_retry",
  "provider_timeout",
  "provider_success",
  "provider_failure",
  "provider_duration",
  "runtime_mock",
  "runtime_http",
]);

function createProviderRuntimeMetrics(initial = {}) {
  const counters = {};
  for (const name of METRIC_NAMES) {
    counters[name] = Number(initial[name] || 0);
  }
  return Object.freeze(counters);
}

/**
 * Design-only in-memory provider metrics counters.
 */
class ProviderRuntimeMetrics {
  constructor(initial = {}) {
    this._counters = { ...createProviderRuntimeMetrics(initial) };
  }

  increment(name, value = 1) {
    ProviderRuntimeMetrics._assertMetricName(name);
    const delta = Number(value);
    if (!Number.isFinite(delta)) {
      throw new Error(`ProviderRuntimeMetrics: invalid increment value for ${name}`);
    }
    this._counters[name] = (this._counters[name] || 0) + delta;
    return this.snapshot();
  }

  observeDuration(durationMs) {
    const value = Number(durationMs);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("ProviderRuntimeMetrics: invalid provider_duration value");
    }
    this._counters.provider_duration = (this._counters.provider_duration || 0) + value;
    return this.snapshot();
  }

  snapshot() {
    return createProviderRuntimeMetrics(this._counters);
  }

  static assertMetricName(name) {
    ProviderRuntimeMetrics._assertMetricName(name);
  }

  static _assertMetricName(name) {
    if (!METRIC_NAMES.includes(name)) {
      throw new Error(`ProviderRuntimeMetrics: unknown metric "${name}"`);
    }
  }
}

module.exports = {
  METRIC_NAMES,
  createProviderRuntimeMetrics,
  ProviderRuntimeMetrics,
};
