/**
 * Application-level metrics.
 */
class ApplicationMetrics {
  constructor({ collector }) {
    this.collector = collector;
  }

  recordRequest(path) {
    this.collector.increment("app.requests", 1, { path });
  }

  recordError(path, errorName) {
    this.collector.increment("app.errors", 1, { path, error: errorName });
  }

  recordLatency(path, durationMs) {
    this.collector.observe("app.latency_ms", durationMs, { path });
  }
}

module.exports = ApplicationMetrics;
