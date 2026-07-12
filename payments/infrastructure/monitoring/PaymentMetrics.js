/**
 * Payment operation metrics.
 */
class PaymentMetrics {
  constructor({ collector }) {
    this.collector = collector;
  }

  recordOperation(operation) {
    this.collector.increment("payment.operations", 1, { operation });
  }

  recordFailure(operation, reason) {
    this.collector.increment("payment.failures", 1, { operation, reason });
  }

  recordLatency(operation, durationMs) {
    this.collector.observe("payment.latency_ms", durationMs, { operation });
  }
}

module.exports = PaymentMetrics;
