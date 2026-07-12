/**
 * Metrics collector — in-memory only, no Prometheus.
 */
class MetricsCollector {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  increment(name, value = 1, labels = {}) {
    const key = this._key(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
    return this.counters.get(key);
  }

  gauge(name, value, labels = {}) {
    const key = this._key(name, labels);
    this.gauges.set(key, value);
    return value;
  }

  observe(name, value, labels = {}) {
    const key = this._key(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key).push(value);
    return value;
  }

  _key(name, labels) {
    return `${name}:${JSON.stringify(labels)}`;
  }

  snapshot() {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      histograms: Object.fromEntries(
        [...this.histograms.entries()].map(([k, v]) => [k, { count: v.length, values: v.slice(-100) }])
      ),
    };
  }
}

module.exports = MetricsCollector;
