/**
 * Health-related metrics.
 */
class HealthMetrics {
  constructor({ collector }) {
    this.collector = collector;
  }

  recordCheck(name, healthy) {
    this.collector.increment("health.checks", 1, { name, healthy: String(healthy) });
    this.collector.gauge("health.status", healthy ? 1 : 0, { name });
  }
}

module.exports = HealthMetrics;
