/**
 * Delivery observability metrics.
 */
class DeliveryAnalytics {
  constructor({ config } = {}) {
    this.config = config;
    this.metrics = {
      deliveriesCreated: 0,
      assignments: 0,
      statusChanges: 0,
      cancellations: 0,
      lifecycleDurationsMs: [],
    };
  }

  recordCreated() {
    this.metrics.deliveriesCreated += 1;
  }

  recordAssignment() {
    this.metrics.assignments += 1;
  }

  recordStatusChange() {
    this.metrics.statusChanges += 1;
  }

  recordCancellation() {
    this.metrics.cancellations += 1;
  }

  recordLifecycleDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.metrics.lifecycleDurationsMs.push(ms);
  }

  getSummary() {
    const durations = this.metrics.lifecycleDurationsMs;
    const averageLifecycleDurationMs = durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0;

    return Object.freeze({
      deliveriesCreated: this.metrics.deliveriesCreated,
      assignments: this.metrics.assignments,
      statusChanges: this.metrics.statusChanges,
      cancellations: this.metrics.cancellations,
      averageLifecycleDurationMs,
      analyticsEnabled: this.config?.enableAnalytics !== false,
    });
  }

  reset() {
    this.metrics = {
      deliveriesCreated: 0,
      assignments: 0,
      statusChanges: 0,
      cancellations: 0,
      lifecycleDurationsMs: [],
    };
  }
}

module.exports = DeliveryAnalytics;
